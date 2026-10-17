# Test report

This report lists **only checks that were actually executed**, with where they ran. Anything that was not executed is listed separately under [Not tested](#not-tested) — please do not read those items as passed.

| | |
| --- | --- |
| Commit | `a92d6e3` (main) |
| Where | GitHub Actions, workflow `CI`, run `39059609751`, 17 October 2026 |
| Environment | `ubuntu-latest` runner, Node.js 22, PostgreSQL 17 (service container), Mailpit mail catcher, Chromium (Playwright 1.64), Lighthouse 12 |
| Data | Seeded **sample content** (`SHOW_SAMPLE_CONTENT=true`) plus records created by the tests |
| Raw output | Branch [`ci-reports`](https://github.com/ravenwebstudio01/ravenwebstudio-website/tree/ci-reports) (logs, Lighthouse summary, screenshots) and `ci-docker-report` (image build log). Both are overwritten by every CI run |

## Summary

| Check | Result |
| --- | --- |
| Dependency install from lockfile (`npm ci`) | Passed |
| Migrations in sync with schema (`drizzle-kit generate` produces no changes) | Passed |
| Lint (ESLint, Next.js + TypeScript rules) | Passed, 0 problems |
| Type check (`tsc --noEmit`, strict) | Passed |
| Unit tests | **45 / 45 passed** |
| Integration tests (real PostgreSQL) | **17 / 17 passed** |
| Production build (`next build`) | Passed |
| Seed + first administrator via `admin:create` | Passed |
| End-to-end tests (production server, Chromium) | **38 / 38 passed**, no retries |
| Automated accessibility (axe, WCAG 2.0/2.1/2.2 A + AA rules) | No serious or critical violations on the 13 pages checked |
| Lighthouse (5 pages × mobile/desktop) | See table below |
| Secret scan (source + client bundles) | No secrets found (193 source files, 24 client bundle files) |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| Docker image build | Passed (built, not started — see Not tested) |

## Unit tests (45)

- **Offers engine (15):** subtotal without offers; percentage on eligible services only; order-total scope; fixed amounts capped at the base and at the maximum discount; non-stackable offers never combined and best option chosen; stackable offers applied in sequence; each offer at most once; date windows (end exclusive), status and client eligibility; case-insensitive codes; manual-approval offers not auto-applied; minimum subtotal / service count / required services; currency mismatches and mixed-currency carts rejected; per-line discounts exact and never negative; empty carts and invalid amounts rejected.
- **Money, utilities, permissions, e-mail, analytics (13):** parsing amounts to cents; round-trips; euro formatting and ranges; percentages ↔ basis points; slugs with European characters; only http(s) external URLs; visible placeholders for missing legal data; editor permissions; plain-language offer descriptions; HTML escaping and header-injection stripping in e-mails; no raw user HTML in notifications; optional omission of personal details; analytics parameters that look like personal data are dropped.
- **Validation (10):** inquiry schema (minimal valid input, required fields with clear messages, unsafe references, multi-value form data); form token (instant, expired and forged submissions); content registry defaults and merging; settings fallbacks; offer schema; internal-only redirect targets.
- **Passwords and images (7):** scrypt hash and verify; unique salts; malformed hashes rejected; password policy; WebP variants without enlargement; SVG, non-images and oversize files rejected; file-name cleaning.

## Integration tests (17, PostgreSQL)

- **Sign-in:** correct credentials (case-insensitive e-mail) are audited; wrong password, unknown and inactive accounts get the same answer; account throttled after repeated failures even with the right password; rate limit per e-mail across IP addresses.
- **Password reset:** single-use tokens, policy enforced, all sessions signed out; no account enumeration.
- **Rate limiter:** allows up to the limit in a window, then blocks.
- **Inquiries:** valid inquiry stored with services and a server-side estimate; private offer codes applied, invalid codes rejected with a field error; bot submissions (honeypot / too fast) silently dropped; forged tokens and invalid input rejected; repeated submissions from one address limited; link-stuffed messages stored as spam without notifications; e-mail status recorded as "not configured" when no provider is set.
- **Estimates and visibility:** recurring prices never summed with one-off prices, hidden prices never used; drafts and sample content hidden from public queries in production mode.
- **Retention:** inquiries older than the retention period are deleted.

## End-to-end tests (38)

Public site:

1–11. Each public page (`/`, `/services`, a service page, `/work`, `/pricing`, `/offers`, `/about`, `/contact`, `/privacy`, `/cookies`, `/legal-notice`) renders without console or page errors and has no serious/critical axe violations.
12. Main navigation reaches every section.
13. Mobile menu opens, and closes with Escape (`aria-expanded` updated).
14. Skip link moves keyboard focus to the main content.
15. Portfolio shows the intentional empty state when nothing is published.
16. Sample content is labelled.
17. Unknown pages return a 404 page.
18. `robots.txt` and `sitemap.xml` are served.
19. Security headers and a nonce-based CSP are sent.
20. `/admin` is `noindex` and requires a session.
21. Protected APIs reject anonymous requests.
22. Organization structured data is present.
23–25. Full-page screenshots at 1440 px, 820 px and 390 px (reviewed manually, see below).

Dashboard and flows:

26. Wrong password shows a neutral message.
27. Login page has no serious/critical axe violations.
28. Business settings saved in the dashboard appear in the site footer; dashboard has no serious/critical axe violations.
29. A service price stays hidden until "Show price" is ticked, then appears publicly.
30. Budget ranges are editable and shown only when enabled.
31. Invalid input (minimum above maximum) is reported next to the fields and keeps the entered values.
32. Portfolio: create a project, upload a cover image (processed to WebP), publish and open it publicly; unpublish (public page then returns 404); preview the unpublished project in the dashboard.
33. Offers: create and publish an offer; calculator shows `E2E SEO bundle: −€100` and total `€3,300` (computed on the server).
34. Collaboration availability can be switched off (the About page then says so) and back on.
35. Inquiry form validates in the browser with an error summary.
36. A visitor submits an inquiry with an indicative estimate; reference `RWS-YYMM-XXXXX` shown; **notification and acknowledgement e-mails delivered to Mailpit**; administrator changes the status, adds a note, exports JSON.
37. An editor account (created by an administrator) is redirected away from inquiries and users, has no Inquiries link, and can open the services editor.
38. Analytics: with a GA4 ID set, no Google request is made before consent or after "Reject"; after "Allow analytics" the GA script is added; the ID is removed again afterwards.

## Lighthouse

Lighthouse 12 against the production build on the CI runner (`localhost`, default mobile throttling / desktop preset):

| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home — mobile | 90 | 100 | 100 | 100 | 2.9 s | 0 | 270 ms |
| Home — desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 10 ms |
| Services — mobile | 93 | 100 | 100 | 100 | 2.7 s | 0 | 200 ms |
| Services — desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 10 ms |
| Work — mobile | 95 | 100 | 100 | 100 | 2.7 s | 0 | 140 ms |
| Work — desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 10 ms |
| Pricing — mobile | 95 | 100 | 100 | 100 | 2.7 s | 0 | 130 ms |
| Pricing — desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms |
| Contact — mobile | 91 | 100 | 100 | 100 | 2.7 s | 0 | 270 ms |
| Contact — desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms |

Scores vary by a few points between runs. The only failing pass/fail audit on every page is **back/forward cache**: pages are rendered per request with `Cache-Control: no-store` (needed for the per-request CSP nonce and immediately visible dashboard changes). Real-world results on Vercel's edge network will differ from these localhost numbers.

## Manual review (screenshots)

The CI screenshots at desktop, tablet and mobile widths were reviewed by eye. One defect was found this way and fixed: at 820 px the header navigation overflowed the viewport (the full navigation now starts at 1024 px; smaller screens use the menu button). After the fix all screenshots are exactly the viewport width (no horizontal scrolling).

## Problems found by testing and fixed

| Problem | Fix |
| --- | --- |
| The storage module was excluded from Git by a too-broad `.gitignore` rule, so a clean checkout did not compile | Rule anchored to `/storage/`; module committed |
| `sharp` < 0.35.5 had high-severity advisories (libvips/libheif) | Upgraded to 0.35.5; `npm audit` clean |
| zod's JIT probe triggered a CSP `unsafe-eval` violation on the contact page | zod configured `jitless` in `src/lib/zod.ts`; lint rule prevents importing zod directly |
| Heading levels skipped on `/work` and `/pricing` (Lighthouse `heading-order`) | Card headings use `h2` when directly under the page title |
| Header overflowed at tablet width | Navigation breakpoint moved to 1024 px |
| React purity lint error (`Date.now()` during render) and two type errors | Fixed in code |
| Docker build failed because the empty `public/` folder is not in Git | Build creates it |
| The per-account sign-in limit (10 per 15 minutes) blocked the end-to-end suite's 11th sign-in — the control worked as designed | Tests reuse a valid session instead of signing in repeatedly |

## Not tested

These items were **not executed** and need checking once the related accounts exist (see `LAUNCH_CHECKLIST.md`):

- **Real e-mail delivery.** Only the local Mailpit catcher was used. No SMTP provider is configured; SPF/DKIM/DMARC and inbox placement are untested.
- **S3-compatible storage.** Uploads were tested with the local-disk driver only. The S3 driver (Supabase Storage, R2, …) has not been run against a real bucket.
- **Hosting.** Nothing has been deployed. Vercel, Supabase, the domain, DNS, HTTPS/HSTS behaviour, the Vercel cron job and preview environments are untested.
- **Docker image at runtime.** The image builds; it has not been started against a database.
- **Google Analytics data collection.** Only the consent gating (whether the script loads) was tested, with a placeholder ID. Whether events arrive in a GA4 property is untested.
- **Google Search Console verification.**
- **Backup workflow and restore procedure.** `backup.yml` has not run (no secrets configured); no restore has been performed.
- **Password reset via the web form end-to-end** (the token logic is covered by integration tests; the e-mail link flow in a browser is not).
- **Maintenance endpoint over HTTP** (`/api/cron/maintenance`) — the retention logic is covered by an integration test, the scheduled call is not.
- **Browsers other than Chromium** (Firefox, Safari/WebKit) and real mobile devices.
- **Manual accessibility testing** with screen readers (NVDA, VoiceOver) and full keyboard-only walkthroughs of the dashboard. Automated axe checks find only part of WCAG issues.
- **Load and penetration testing.**
- **Legal review** of the privacy notice, cookie policy and legal notice templates.

## Reproducing

```bash
npm ci
npm run lint && npx next typegen && npm run typecheck
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/ravenwebstudio_test npx vitest run
npm run build && npm run db:seed && npm run admin:create -- --if-missing --name "Test Admin"
COOKIE_SECURE=false npm run start &
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

Environment variables as in `.github/workflows/ci.yml` (including `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SHOW_SAMPLE_CONTENT=true` and Mailpit SMTP settings).
