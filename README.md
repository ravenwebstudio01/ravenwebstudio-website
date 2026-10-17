# RavenWebStudio website

The business website and content-management dashboard for **RavenWebStudio**, a web development studio serving businesses across Europe.

- **Public site** — home, services, portfolio, project types and budgets, offers and bundles, about and collaboration, contact/inquiry form, privacy notice, cookie policy and legal notice.
- **Dashboard** (`/admin`) — inquiries (status, notes, export, deletion), portfolio projects with image uploads and preview, services, budget categories, collaborations, offers and discount rules with a calculator, editable page copy, categories, media library, redirects, site settings, users and roles, audit log, launch-readiness checklist.
- **Security, privacy, SEO and analytics** are built in rather than bolted on — see [`docs/`](docs).

> All business copy, prices, contact details and legal texts are editable in the dashboard. The seeded content is **sample content**: it is labelled as such and hidden in production until you review it.

---

## Technology

| Area | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) | Server rendering for SEO, server actions for the dashboard, one codebase |
| Styling | Tailwind CSS 4 with design tokens in `src/app/globals.css` | Consistent, editable design system with tiny CSS output |
| Database | PostgreSQL 15+ via Drizzle ORM | Relational data with constraints, typed queries, SQL migrations, no binary engines |
| Auth | Own session auth: scrypt hashes, DB sessions, `__Host-` cookies | No third-party dependency; revocable sessions; enforced on the server |
| Validation | zod (shared by browser and server) | One source of truth for form rules |
| Images | sharp → WebP in 480/960/1440/2048 px | Re-encoding strips metadata and neutralises malicious files |
| Storage | Local disk (dev/VPS) or any S3-compatible bucket | Supabase Storage, Cloudflare R2, Scaleway, Hetzner, AWS |
| E-mail | SMTP via nodemailer | Works with Brevo, Postmark, Mailgun EU, Resend, SES… |
| Analytics | Google Analytics 4, loaded **only after consent** | GDPR-friendly by default |
| Tests | Vitest (unit + integration on real PostgreSQL), Playwright + axe (end-to-end, accessibility), Lighthouse | Run in GitHub Actions on every push |

## Project structure

```
src/
  app/(site)/         public pages (layout with header, footer, consent manager)
  app/admin/          login, password reset and the protected dashboard
  app/api/            health check, media upload, inquiry export, cron endpoint
  components/         brand (raven mark), site and admin UI components
  lib/                business logic: auth, offers engine, inquiries, content, storage, email, security
  proxy.ts            per-request CSP nonce + early redirect for /admin
scripts/              migrate, seed, create-admin, reset-password, purge-retention
drizzle/              SQL migrations (generated from src/lib/db/schema.ts)
tests/                unit and integration tests
e2e/                  Playwright end-to-end, accessibility and screenshot tests
docs/                 deployment, security, privacy, analytics, architecture, launch checklist
```

## Prerequisites

- Node.js **22.13+** (see `.nvmrc`)
- PostgreSQL **15+** (local Docker setup included)
- Optional: Docker (for the local database and mail catcher)

## Local development

```bash
git clone https://github.com/ravenwebstudio01/ravenwebstudio-website.git
cd ravenwebstudio-website
npm install
cp .env.example .env                       # then set SESSION_SECRET (see below)
docker compose up -d db mailpit            # PostgreSQL on :5432, mail catcher UI on http://localhost:8025
npm run db:migrate                         # create tables
npm run db:seed                            # optional: sample content + default settings
npm run admin:create -- --email you@example.com --name "Your Name"
npm run dev                                # http://localhost:3000 and http://localhost:3000/admin
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

To see the inquiry e-mails locally, set `SMTP_HOST=localhost`, `SMTP_PORT=1025` and `MAIL_FROM="RavenWebStudio <dev@localhost>"` and open Mailpit at http://localhost:8025.

## Environment variables

All variables are documented in [`.env.example`](.env.example). Summary:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SITE_URL` | yes (prod) | Public base URL, e.g. `https://ravenwebstudio.eu`. Used for canonical URLs, sitemap and e-mail links |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `DATABASE_SSL` | prod | `require` or `verify` for managed databases (`disable` locally) |
| `SESSION_SECRET` | yes (prod) | ≥ 32 random characters; signs form tokens and pseudonymises IPs |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | for e-mail | Inquiry notifications, acknowledgements, password resets |
| `STORAGE_DRIVER` | yes | `local` or `s3` (**s3 is required on Vercel**) |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL` | with s3 | Bucket for uploaded images |
| `CRON_SECRET` | recommended | Protects `/api/cron/maintenance` (data retention clean-up) |
| `TRUST_PROXY` | self-hosting | `true` behind your own reverse proxy so client IPs are read correctly |
| `SHOW_SAMPLE_CONTENT` | dev only | Shows records flagged as sample content. Keep `false` in production |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `GOOGLE_SITE_VERIFICATION` | optional | Fallbacks; normally set in Dashboard → Site settings |

## Database and migrations

- Schema: [`src/lib/db/schema.ts`](src/lib/db/schema.ts) (constraints, indexes and enums are defined there).
- After changing the schema: `npm run db:generate`, review the SQL in `drizzle/`, commit it, then `npm run db:migrate` in each environment. CI fails if the schema and migrations are out of sync.
- Deployments run `npm run db:migrate` **before** switching traffic (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Administrator accounts

There is no public registration.

- **First administrator:** `npm run admin:create -- --email you@example.com --name "Your Name"`. The password is typed into a hidden prompt (never a command-line argument). In automated environments set `ADMIN_PASSWORD` for that one command instead.
- **More users:** Dashboard → Users (administrators only). A temporary password is shown once; the person changes it under *My account*.
- **Forgotten password:** "Forgot your password?" on the login page (requires SMTP), or `npm run admin:reset-password -- --email you@example.com` on the server. Resets sign the user out everywhere.
- **Roles:** *Administrator* (everything) and *Editor* (website content and images only — no inquiries, offers, users or settings).

## Testing

```bash
npm run lint            # ESLint (Next.js + TypeScript rules)
npm run typecheck       # TypeScript (run `npx next typegen` first on a fresh clone)
npm run test:unit       # pure logic: offers engine, validation, money, security helpers, image pipeline
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/ravenwebstudio_test npm run test:integration
npm run build && npm run start &   # then:
npm run test:e2e        # Playwright: public pages, accessibility (axe), admin flows, inquiry + e-mail, consent
```

Integration tests **truncate** the database in `TEST_DATABASE_URL` — never point it at real data. End-to-end tests expect the seeded sample content, `SHOW_SAMPLE_CONTENT=true`, an administrator from `ADMIN_EMAIL`/`ADMIN_PASSWORD` and Mailpit on `localhost:1025/8025` (exactly what CI sets up).

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs all of the above plus a production build, Lighthouse, `npm audit`, a secret scan of the source and client bundles, and a Docker build. Reports and screenshots are published to the `ci-reports` branch.

## Production build

```bash
npm run build
npm run start            # serves on PORT (default 3000)
```

Docker: `docker build -t ravenwebstudio .` builds a standalone image that runs as a non-root user with a health check on `/api/health`.

## Deployment

The recommended setup is **Vercel (Frankfurt, `fra1`) + Supabase PostgreSQL and Storage in an EU region**. A Docker/VPS alternative is documented too. Full step-by-step instructions, including DNS, HTTPS, environment variables, cron, preview environments and rollback: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

Plans worth knowing about before launch (verify current pricing yourself):

- Vercel's Hobby plan is restricted to non-commercial use; a business site needs **Pro** ($20 per developer seat/month).
- Supabase's Free plan pauses projects after a week of inactivity and has no automatic backups; **Pro** (from $25/month) keeps projects running and includes 7 days of daily backups.

## Third-party integrations

| Integration | How to enable | Status in this repository |
| --- | --- | --- |
| SMTP e-mail | Set the `SMTP_*` and `MAIL_FROM` variables, then Dashboard → Site settings → *Send test e-mail* | Implemented, needs credentials |
| S3-compatible storage | Set `STORAGE_DRIVER=s3` and the `S3_*` variables | Implemented, needs a bucket |
| Google Analytics 4 | Dashboard → Site settings → measurement ID | Implemented, consent-gated, needs an ID |
| Google Search Console | Dashboard → Site settings → verification token, then submit `https://<domain>/sitemap.xml` | Implemented, needs your property |
| Vercel Cron | `vercel.json` (daily at 03:17 UTC) + `CRON_SECRET` | Implemented |

## Backups and restoration

See [docs/DEPLOYMENT.md#backups](docs/DEPLOYMENT.md#backups). In short: managed daily backups (Supabase Pro), plus an optional encrypted weekly `pg_dump` via GitHub Actions ([`.github/workflows/backup.yml`](.github/workflows/backup.yml)), plus bucket versioning for images. Restore with `pg_restore` into a fresh database, run `npm run db:migrate`, and point `DATABASE_URL` at it.

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `DATABASE_URL is not configured` | Copy `.env.example` to `.env` (scripts read `.env` and `.env.local`) |
| `SESSION_SECRET must be set…` in production | Set a ≥ 32-character secret in the host's environment variables |
| Login works locally but not on a plain-HTTP test server | Secure cookies need HTTPS; for HTTP-only staging set `COOKIE_SECURE=false` |
| Every visitor shares one rate limit on a VPS | Set `TRUST_PROXY=true` behind Caddy/Nginx so real client IPs are used |
| Uploaded images disappear after a Vercel deploy | Local disk is ephemeral there — use `STORAGE_DRIVER=s3` |
| "This form has expired" on the contact page | The page was open > 24 h; reload it |
| No inquiry e-mails | Check Dashboard → Site settings → Integrations; the inquiry detail page shows the delivery status of each e-mail |
| Sample services visible in production | `SHOW_SAMPLE_CONTENT` must be `false`; review each sample item and untick "Sample content" |
| CSP errors in the browser console | Add any new third-party origin to `buildCsp` in `src/proxy.ts` |

## Documentation

- [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) — everything that must happen before go-live
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — hosting, DNS, HTTPS, CI/CD, backups, rollback
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, content model, offer rules, request flow
- [docs/SECURITY.md](docs/SECURITY.md) — implemented controls and operating guidance
- [docs/PRIVACY.md](docs/PRIVACY.md) — personal data map, retention, data-subject requests, what lawyers should review
- [docs/ANALYTICS.md](docs/ANALYTICS.md) — GA4 set-up, consent model and event catalogue
- [docs/TEST_REPORT.md](docs/TEST_REPORT.md) — results of the tests actually executed
