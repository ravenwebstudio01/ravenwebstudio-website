# Security

This document lists the controls implemented in the code and the operational steps that remain your responsibility. It is not a penetration-test report; no external security assessment has been carried out.

## Authentication

| Control | Implementation |
| --- | --- |
| No public registration | Accounts are created only by `npm run admin:create` (server shell) or by an administrator in the dashboard |
| Password storage | scrypt (N = 2¹⁷, r = 8, p = 1, 16-byte random salt), parameters stored with the hash; hashes are upgraded on login if parameters change |
| Password policy | Minimum 12 characters, maximum 200; rejects a short list of very common passwords and passwords containing the account's e-mail name |
| Initial password | Typed into a hidden prompt or taken from `ADMIN_PASSWORD` for that one command; never stored in the repository or logs |
| Sessions | 256-bit random token in an `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefixed cookie. Only the SHA-256 of the token is stored. 12-hour idle timeout, 7-day absolute lifetime |
| Revocation | Sign out (current session), "sign out other sessions" in *My account*, automatic revocation on password change/reset and when an administrator deactivates a user. Role changes take effect on the next request because the role is read from the database every time |
| Brute force | Temporary per-account lock after 5 failed attempts (1 minute, doubling with each further failure, capped at 15 minutes so attackers cannot lock an administrator out for long), plus rate limits per pseudonymised IP (30 / 15 min) and per e-mail (10 / 15 min). Login failures take constant time whether or not the account exists |
| Password reset | Single-use token (SHA-256 stored), valid 30 minutes, rate-limited; the response never reveals whether an e-mail is registered |

## Authorisation

- Roles: **administrator** (everything) and **editor** (`content:manage`, `media:upload`). Inquiries, offers, users, settings, redirects and the audit log require administrator.
- Every protected page, server action and API route checks the session **and** the permission on the server. The proxy redirect is a convenience, not a security boundary.
- Administrators cannot remove their own administrator role or disable themselves, and the last active administrator cannot be removed.

## Input handling

- All input is validated with zod on the server (the same schemas run in the browser for usability only). Lengths are bounded everywhere.
- Database access goes through Drizzle's parameterised queries; no SQL is built from strings.
- React escapes output by default; markdown is rendered without raw HTML. E-mail templates escape every interpolated value and strip line breaks from header values.
- Redirect targets (`?next=` after login, the redirects table) accept internal paths only — no open redirects.
- Uploads: size limit, MIME sniffing by decoding with sharp, re-encoding to WebP (removes metadata and any embedded payload), SVG rejected, random file names, served with `X-Content-Type-Options: nosniff`.

## CSRF and cross-origin

- Server actions are protected by Next.js's built-in origin check.
- Route handlers that change state (`/api/admin/media`) require an `Origin` header matching the site's host.
- Cookies are `SameSite=Lax`; there is no CORS configuration, so other origins cannot read responses.

## HTTP headers

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | Per-request nonce with `strict-dynamic`; `default-src 'self'`; `object-src 'none'`; `frame-ancestors 'none'`; `form-action 'self'`; Google Analytics origins only. `style-src-attr 'unsafe-inline'` is allowed for framework-generated style attributes (scripts remain nonce-only) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` in production (add `preload` only after you are sure every subdomain serves HTTPS) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera, microphone, geolocation, payment, USB and Topics API disabled |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `/admin/*` | `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` |
| `X-Powered-By` | Removed |

## Spam and abuse protection (inquiry form)

Honeypot field, signed time token (minimum 3 s, maximum 24 h), rate limits (5 per 10 min and 20 per day per pseudonymised IP; 3 per hour per e-mail), link-count heuristic. Suspected spam is kept with status *spam* so false positives can be recovered. No third-party CAPTCHA is used; if spam becomes a problem, consider adding Cloudflare Turnstile or Friendly Captcha (both require a privacy-notice update).

## Logging and audit

- The audit log records sign-ins (successful, failed, locked, throttled), sign-outs, password changes and resets, user and role changes, publishing/unpublishing, deletions, image uploads, settings and page-content changes, redirects, inquiry exports, notes and status changes, with the actor and a pseudonymised IP (HMAC with the session secret — not reversible without it).
- Error responses never include stack traces or internal details; errors are logged server-side.
- Secrets are never logged. CI scans the source and the built client bundles for secret patterns.

## Secrets

- All secrets come from environment variables (`.env` locally — ignored by Git — and the host's secret store in production). `.env.example` contains no real values.
- `SESSION_SECRET` must be at least 32 characters in production or the app refuses to start. Rotating it signs everyone out and makes old IP pseudonyms unlinkable.
- Rotate SMTP and S3 keys if a team member with access leaves.

## Dependencies

- Versions are pinned through `package-lock.json`. CI runs `npm audit --omit=dev --audit-level=high` on every push.
- Enable **Dependabot alerts and security updates** in the GitHub repository settings (one click, free).

## Operational checklist

- [ ] Make the repository private (it is currently public — no secrets are in it, but the code and commit history are visible).
- [ ] Enable branch protection on `main` and require the CI check.
- [ ] Enable two-factor authentication on GitHub, Vercel, Supabase, the domain registrar and the e-mail provider.
- [ ] Use a password manager for the admin account; create separate accounts per person (no shared logins).
- [ ] Review the audit log monthly; disable accounts of people who no longer need access.
- [ ] Keep the database reachable only via TLS and only by the application (Supabase: restrict network access if available on your plan).
- [ ] Test a backup restore before launch and after major changes.

## Reporting a vulnerability

Add a `security.txt` (`public/.well-known/security.txt`) with a contact address once you have one you will monitor.

## Known limitations

- No multi-factor authentication for dashboard accounts yet (recommended next step: TOTP).
- Rate limits are stored in PostgreSQL (fixed window). This is adequate for a studio website; a high-traffic deployment would use a dedicated store or the hosting provider's firewall.
- No external penetration test has been performed.
