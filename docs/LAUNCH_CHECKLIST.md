# Launch checklist

The dashboard shows a live version of the most important items (Dashboard → *Launch readiness*). Tick everything here before announcing the site.

## 1. Business information (you)

- [ ] Confirm the legal entity: registered name, address, registration number, VAT ID, country — enter them in *Site settings*. Leave fields empty rather than guessing.
- [ ] Public contact e-mail and (private) notification e-mail in *Site settings*.
- [ ] Final service list: review each sample service, correct the text, set prices (or keep them private), untick **Sample content**, publish. Archive services you do not offer.
- [ ] Budget categories: enter real ranges, decide whether to show them, untick **Sample content**.
- [ ] Collaboration types: review, untick **Sample content**, set availability.
- [ ] Offers: decide which (if any) to publish; test each in the *Offer calculator*. The seeded example offer is a draft.
- [ ] Portfolio: add only projects the client has approved; tick "client approved name" and "results verified" only when true.
- [ ] Review all *Page content* — the default copy is a draft (e.g. the "written scope before work starts" promise must match how you actually work).
- [ ] Optional: upload a logo in *Site settings* (the raven wordmark is used otherwise).

## 2. Legal and privacy (you + adviser)

- [ ] Complete the **privacy notice** template: controller details, processors (hosting, database, e-mail, analytics) with locations and transfer safeguards, retention, rights, supervisory authority. Tick *Reviewed*.
- [ ] Complete the **cookie policy** to match what is really used (GA4 only if configured). Tick *Reviewed*.
- [ ] Complete the **legal notice** (imprint) if required where you operate. Tick *Reviewed*.
- [ ] Sign data processing agreements (DPAs) with Vercel, Supabase (or your hosts), your e-mail provider and Google (if GA4 is used).
- [ ] Confirm the inquiry retention period (default 24 months) and audit-log retention (default 12 months) in *Site settings*.
- [ ] Have the texts reviewed by someone qualified. Generated templates do not guarantee GDPR compliance.

## 3. Infrastructure (developer)

- [ ] Hosting plan suitable for commercial use (Vercel Pro or own server).
- [ ] Production database in the EU with automated backups (Supabase Pro or own `pg_dump` schedule) — **restore tested once**.
- [ ] `npm run db:migrate` applied; first administrator created with `npm run admin:create`.
- [ ] Environment variables set as in `.env.example`; `SHOW_SAMPLE_CONTENT=false`; `SITE_URL` is the real domain; `SESSION_SECRET` random and ≥ 32 characters.
- [ ] `STORAGE_DRIVER=s3` (on Vercel) and an image upload tested end-to-end.
- [ ] SMTP configured; SPF, DKIM and DMARC records published; *Send test e-mail* succeeds; a test inquiry produces the notification and acknowledgement e-mails.
- [ ] `CRON_SECRET` set and the cron job visible in Vercel (or crontab on a VPS).
- [ ] Domain added, HTTPS active, `www` ↔ apex redirect working.
- [ ] Uptime monitor on `/api/health`.
- [ ] Repository visibility decided (private recommended); branch protection on `main` requiring the CI check.
- [ ] Optional: enable the encrypted backup workflow (`BACKUP_DATABASE_URL`, `BACKUP_PASSPHRASE` secrets).

## 4. Search and analytics

- [ ] Google Search Console: add the domain property, put the verification token in *Site settings*, verify, then submit `https://your-domain/sitemap.xml`.
- [ ] GA4 (optional): create a property with **data retention** set as short as practical and Google signals off; paste the measurement ID in *Site settings*; mark `generate_lead` as a key event; confirm the consent banner appears and that rejecting prevents any Google request.
- [ ] Check `https://your-domain/robots.txt` allows crawling on production (previews are blocked automatically).

## 5. Final checks (anyone)

- [ ] Submit a real inquiry from a phone; check it in the dashboard and inbox.
- [ ] Sign in as an editor account and confirm it cannot see inquiries.
- [ ] Run Lighthouse on the homepage and contact page (CI does this too).
- [ ] Read every public page once on mobile for typos and placeholders such as `[legalName — to be completed]`.
