# Privacy and GDPR — technical notes

> This is engineering documentation, not legal advice. The legal page templates in the dashboard and the notes below do **not** by themselves make the website GDPR-compliant. Have the final texts and your processing activities reviewed by a qualified adviser for the countries where RavenWebStudio operates.

## Personal data map

| Data | Source | Purpose | Lawful basis to confirm with your adviser | Where stored | Retention (default) |
| --- | --- | --- | --- | --- | --- |
| Inquiry: name, e-mail, company, phone, country, website URL, project description, selected services, budget, timeline, collaboration type, offer code | Contact form | Reply to the inquiry and prepare a proposal | Steps prior to a contract (Art. 6(1)(b)) / legitimate interest (Art. 6(1)(f)) | Database | Deleted automatically after **24 months** (configurable 1–120) |
| Inquiry notes | Dashboard users | Internal follow-up | Legitimate interest | Database | Deleted with the inquiry |
| Inquiry e-mails | Generated on submission | Notify you; confirm receipt to the sender | As above | Your SMTP provider and mailboxes | Governed by your mailbox and provider settings |
| Dashboard accounts: name, e-mail, password hash, role | Administrator | Access control | Legitimate interest / employment | Database | Until the account is deleted |
| Sessions: token hash, user agent, pseudonymised IP, timestamps | Sign-in | Security | Legitimate interest | Database | Removed when expired (≤ 7 days) |
| Audit log: actor, action, entity, pseudonymised IP | Dashboard activity | Security and accountability | Legitimate interest | Database | Deleted after **12 months** (configurable) |
| Rate-limit counters: pseudonymised IP or e-mail | Form submissions, sign-ins | Abuse prevention | Legitimate interest | Database | Removed when the window expires (≤ 24 h) |
| Consent choice (`rws_consent` cookie) | Banner | Remember the analytics choice | Legal obligation / legitimate interest | Visitor's browser | 6 months |
| Analytics data (GA4) | Only after consent | Understand site usage | Consent (Art. 6(1)(a)); ePrivacy consent for cookies | Google | Set in GA4 (choose 2 or 14 months) |
| Server logs (hosting provider) | Every request | Operations and security | Legitimate interest | Hosting provider | Provider-defined (Vercel: short; check your plan) |

**Pseudonymised IP** means an HMAC-SHA-256 of the IP address with the server's `SESSION_SECRET`. Raw IP addresses are not stored in the database.

**Not collected:** no newsletter, no marketing pixels, no remarketing, no fingerprinting, no third-party fonts (fonts are self-hosted at build time), no embedded third-party media.

## Processors to list in the privacy notice

Depending on the set-up you choose (see `DEPLOYMENT.md`):

- Hosting: Vercel Inc. (functions in Frankfurt; Vercel is a US company — check its DPA and transfer mechanism) or your VPS provider.
- Database and storage: Supabase (EU region) or your VPS provider / object storage provider.
- E-mail: your SMTP provider (prefer EU-based or EU-region sending).
- Analytics (if enabled): Google Ireland Ltd / Google LLC.
- Source code and CI: GitHub (no production personal data is processed there unless you enable the backup workflow, which stores **encrypted** dumps as artifacts).

## Data-subject requests

| Request | How to handle it in the dashboard |
| --- | --- |
| Access / portability | *Inquiries* → open the inquiry → **Export (JSON)** (includes services, internal notes and status). Search by e-mail in the inquiries list to find all of a person's inquiries |
| Rectification | Submitted inquiries are not editable, to preserve the record; add a note with the correction, or delete and ask the person to resubmit |
| Erasure | *Inquiries* → open → **Delete inquiry** under *Delete personal data* (removes notes and service links; the deletion is recorded in the audit log). Remember to delete related e-mails in your mailbox |
| Objection / restriction | Set status to *Archived* and add a note; delete if appropriate |

Deadline: one month from receipt (extendable in some cases). Keep a record of requests and responses.

Backups: deleted data persists in backups until they rotate out (7 days on Supabase Pro, 30 days for the optional workflow). Mention this in the privacy notice.

## Privacy by design in the code

- Only fields needed to answer an inquiry are requested; phone, company, country, budget, timeline and website are optional.
- The privacy notice is linked next to the submit button and the time of acknowledgement is recorded.
- Retention is enforced automatically by the daily maintenance job (`/api/cron/maintenance` or `npm run retention:purge`).
- Analytics parameters are filtered so they cannot contain e-mail addresses, long numbers or free text (`sanitiseParams`).
- The dashboard is `noindex` and `no-store` so personal data is not cached by browsers or proxies.

## Items for your legal reviewer

1. Legal entity details, registration and VAT information for the legal notice (left as placeholders until you confirm them).
2. Lawful bases in the table above.
3. International transfers (Vercel, Google, GitHub) and the safeguards relied on.
4. Retention periods for inquiries and audit logs.
5. Whether GA4 is used at all, and the cookie-banner wording.
6. Whether a record of processing activities (Art. 30) and a DPA register are needed for your organisation.
7. Supervisory authority to name in the privacy notice.
