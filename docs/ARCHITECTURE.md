# Architecture

## Overview

```
Browser ──► proxy.ts (CSP nonce, early /admin redirect)
          ──► Next.js App Router (server components, server actions, route handlers)
                ├── src/lib/content/queries.ts  ── public reads (published, non-sample unless SHOW_SAMPLE_CONTENT)
                ├── src/lib/inquiries/service.ts ── inquiry intake (validation, anti-spam, estimate, e-mail)
                ├── src/lib/offers/*            ── discount engine (pure) + loaders
                ├── src/lib/auth/*              ── sessions, passwords, roles, guards
                └── src/lib/db (Drizzle)  ──► PostgreSQL
                    src/lib/storage       ──► local disk or S3-compatible bucket
                    src/lib/email         ──► SMTP (optional)
```

- **One deployable**: the public site, dashboard and API live in the same Next.js app. Every page is rendered on the server per request (`await connection()` in the root layout) so the CSP nonce is fresh and dashboard changes appear immediately without cache invalidation.
- **No client-side data fetching from the database.** Browsers talk only to the app; the database is never exposed.
- **Server actions** (dashboard forms, inquiry form) all go through `runAction` (`src/lib/admin/run-action.ts`), which checks the session and permission, parses input with zod and maps errors to field messages.

## Directory map

| Path | Responsibility |
| --- | --- |
| `src/app/(site)` | Public pages. `layout.tsx` adds header, footer, consent manager and Organization JSON-LD |
| `src/app/admin/(auth)` pages | Login, forgot/reset password (public) |
| `src/app/admin/(protected)` | Dashboard; `layout.tsx` calls `requireAdminPage()` and filters navigation by role |
| `src/app/api` | `health`, `cron/maintenance`, `admin/media` (upload), `admin/inquiries/[id]/export` |
| `src/app/media/[...path]` | Serves files from local storage (dev/VPS) with long-lived caching |
| `src/lib/content/registry.ts` | Definition of every editable text block (fields, defaults, validation) |
| `src/lib/settings.ts` | Site-wide settings (singleton row) with safe defaults |
| `src/lib/db/schema.ts` | Tables, enums, constraints, indexes |

## Data model

```
users ─< sessions
users ─< password_reset_tokens
users ─< audit_logs (actor, nullable)

service_categories ─< services >─< service_relations (related/recommended add-ons)
project_categories ─< projects >─< project_services >─ services
projects ─< project_media >─ media;  projects.cover_media_id ─ media
budget_tiers >─< budget_tier_services >─ services
offers >─< offer_services (role: required | eligible) >─ services
inquiries ─< inquiry_services (snapshot of service name, kind: requested | additional)
inquiries ─< inquiry_notes
inquiries ─ budget_tiers / collaboration_types / offers (nullable, ON DELETE SET NULL)
site_settings (id = 1), content_blocks (key → JSON), redirects, rate_limits
```

Conventions:

- **Money** is stored as integer minor units (cents) with an ISO currency code; percentages as basis points (`1250` = 12.5 %). No floating-point arithmetic on prices.
- **Publishing**: content tables share a `status` enum (`draft`, `published`, `archived`) plus `sort_order`.
- **Sample content**: `is_sample = true` rows are created only by `npm run db:seed`. They are hidden from the public site unless `SHOW_SAMPLE_CONTENT=true`, and labelled "Sample" wherever they appear.
- **Snapshots**: inquiries store the service names, budget label and price estimate as they were at submission time, so later edits do not rewrite history.
- **Slugs**: lowercase `a-z0-9-`. When a published item's slug changes, a redirect from the old path is recorded automatically (`src/lib/admin/redirects.ts`); redirects accept internal paths only.

## Content model

- **Structured content** (services, projects, budgets, collaborations, offers) has dedicated tables and editors.
- **Page copy** (hero, section intros, about page, legal pages, SEO defaults) lives in `content_blocks`. Each key is declared once in `CONTENT_SECTIONS` with field types, limits and default text; the dashboard renders an editor from that definition and validates with the same schema. Missing or invalid stored values fall back to defaults instead of breaking a page.
- **Legal pages** contain `{{placeholders}}` (e.g. `{{legalName}}`) filled from site settings. An empty setting renders as `[legalName — to be completed]` so gaps are visible, never invented. A `reviewed` flag drives the launch-readiness checks.
- **Markdown**: long-form fields are rendered with `react-markdown` (GFM tables, line breaks). Raw HTML is not rendered; links to other origins get `rel="noopener noreferrer"`.

## Offer and discount rules

The engine (`src/lib/offers/engine.ts`) is a pure function, so it is unit-tested exhaustively and produces the same result in the dashboard calculator and in the inquiry form.

Input: selected services with their prices, client status (new / existing), active offers, optional codes, optional manually approved offer IDs, and the evaluation time.

1. **Eligibility** per offer: status published and within `starts_at`/`ends_at`; client eligibility (any / new / existing); required code (case-insensitive); all required services selected; minimum number of services; minimum subtotal; currency match for fixed amounts; `requires_approval` offers apply only when approved by an administrator. Ineligible offers are returned with a reason code (shown in the calculator).
2. **Scope**: an offer discounts either the whole order or only its "eligible" services.
3. **Combination**: compares (a) the single best non-stackable offer with (b) all stackable offers applied in priority order on the remaining amounts, and keeps whichever is better for the client. Each offer applies at most once; a line can never go below zero.
4. **Allocation**: order-level discounts are spread across lines with the largest-remainder method so line totals add up to the cent.
5. **Currencies and units**: prices in different currencies are never summed (the estimate reports `mixed_currency`); monthly and hourly prices are never added to per-project prices (they are excluded from the estimate, which reports `only_recurring` if nothing else is left).

The visitor-facing estimate is labelled *indicative*; the stored snapshot records which offers applied. Final prices are always confirmed in a written proposal.

## Request flows

**Inquiry submission**

1. `/contact` renders a signed form token (HMAC of the timestamp) and an invisible honeypot field.
2. On submit, the server action validates with the shared zod schema, checks the honeypot, the token (minimum 3 seconds, maximum 24 hours), rate limits (per pseudonymised IP and per e-mail) and a link-count heuristic. Obvious bots (honeypot filled, or submitted faster than a person could) get a normal-looking success response but nothing is stored. Messages that pass those checks but look like spam (many links) are stored with status `spam` and trigger no e-mails, so a false positive can still be recovered.
3. Selected services and offer code are re-evaluated on the server (`computeEstimate`); client-supplied prices are never trusted.
4. The inquiry, services and estimate snapshot are written in one transaction; a reference such as `RWS-2610-7K3QD` is returned.
5. After the response is sent (`after()`), notification and acknowledgement e-mails are attempted if SMTP is configured; each delivery status (`sent`, `failed`, `not_configured`) is stored and shown in the dashboard.

**Admin request**

`proxy.ts` redirects requests without a session cookie → page/action calls `getCurrentSession()` (DB lookup by SHA-256 of the token, idle and absolute expiry, sliding refresh) → permission check (`requireAdminPage` / `requireActionUser`) → mutation → audit-log entry.

**Image upload**

`POST /api/admin/media` (same-origin check, session, `media:upload` permission, rate limit, 4 MB limit) → sharp decodes and re-encodes to WebP at 480/960/1440/2048 px widths (metadata stripped, SVG and animated formats rejected) → storage driver writes the files → `media` row stores variants, dimensions and alt text.

## Testing layers

| Layer | Location | Scope |
| --- | --- | --- |
| Unit | `tests/unit` | Offers engine, money/percent parsing, validation schemas, password hashing, image pipeline |
| Integration | `tests/integration` | Real PostgreSQL: auth, sessions, lockout, password reset, inquiry intake, rate limits, sample visibility |
| End-to-end | `e2e/` | Production build in a browser: public pages, accessibility (axe), admin flows, e-mail via Mailpit, consent |
| Performance | CI Lighthouse | 5 pages × mobile/desktop |
