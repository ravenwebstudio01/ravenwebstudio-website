# Deployment

This application is a standard Next.js server application with a PostgreSQL database and an image bucket. Two supported set-ups:

| | **A. Vercel + Supabase (recommended)** | **B. Docker on an EU VPS** |
| --- | --- | --- |
| Effort | Lowest | Moderate (you run the server) |
| Cost (indicative, check current pricing) | Vercel Pro $20/seat/month + Supabase Pro from $25/month | VPS from roughly €5–15/month + backup storage |
| Region | Vercel `fra1` (Frankfurt) + Supabase EU region | Any EU data centre |
| Backups | Supabase daily backups (Pro, 7 days) + optional `pg_dump` workflow | Your responsibility (script below) |
| HTTPS | Automatic | Automatic with Caddy |

Nothing in the code is tied to either option.

---

## A. Vercel + Supabase

### 1. Database and storage (Supabase)

1. Create a project in an **EU region** (for example Frankfurt `eu-central-1`). Choose a strong database password and store it in your password manager.
2. *Project Settings → Database → Connection string*: copy the **Transaction pooler** URI (port 6543) for the application, and the **direct/session** URI for migrations.
3. *Storage*: create a **public** bucket called `media`. Then *Project Settings → Storage → S3 access keys*: create an access key.
   - `S3_ENDPOINT` = `https://<project-ref>.supabase.co/storage/v1/s3`
   - `S3_REGION` = the project region (e.g. `eu-central-1`)
   - `S3_BUCKET` = `media`
   - `MEDIA_PUBLIC_BASE_URL` = `https://<project-ref>.supabase.co/storage/v1/object/public/media`
4. Leave Row Level Security alone for the database: the application connects with its own credentials and never exposes the database to browsers. (Do **not** expose the anon key; this app does not use the Supabase client SDK.)

### 2. Hosting (Vercel)

1. *Add New → Project* and import the GitHub repository. Framework preset: Next.js. Root directory: `/`.
2. *Settings → Functions → Region*: `fra1` (also set in `vercel.json`).
3. *Settings → Environment Variables* (Production, and separately for Preview):

   | Variable | Production value |
   | --- | --- |
   | `SITE_URL` | `https://your-domain.eu` |
   | `DATABASE_URL` | Supabase transaction-pooler URI |
   | `DATABASE_SSL` | `require` (or `verify` + `DATABASE_CA_CERT` with Supabase's CA certificate) |
   | `DATABASE_POOL_MAX` | `3` |
   | `SESSION_SECRET` | 48+ random characters |
   | `STORAGE_DRIVER` | `s3` + the `S3_*` / `MEDIA_PUBLIC_BASE_URL` values above |
   | `SMTP_*`, `MAIL_FROM` | from your e-mail provider |
   | `CRON_SECRET` | 32+ random characters |
   | `SHOW_SAMPLE_CONTENT` | `false` |

   Use a **separate database** (or Supabase branch) for Preview deployments so previews never touch production data.
4. Run migrations from your machine (or CI) against the **direct** connection string before the first deploy:
   ```bash
   DATABASE_URL="<direct URI>" DATABASE_SSL=require npm run db:migrate
   DATABASE_URL="<direct URI>" DATABASE_SSL=require npm run admin:create -- --email you@your-domain.eu --name "Your Name"
   ```
   Optionally `npm run db:seed` to load the default settings and sample content for review.
5. Deploy. Vercel builds on every push; `main` goes to production, other branches to preview URLs.
6. *Settings → Cron Jobs*: confirm `/api/cron/maintenance` is listed (from `vercel.json`).

### 3. Domain, DNS and HTTPS

1. *Settings → Domains*: add `your-domain.eu` and `www.your-domain.eu`; choose one as primary (the other redirects).
2. At your registrar, create the records Vercel shows (an `A` record for the apex and a `CNAME` for `www`, or switch nameservers to Vercel).
3. Vercel issues and renews TLS certificates automatically. HSTS is sent by the app in production.
4. E-mail DNS for your sending domain (from your SMTP provider): SPF, DKIM and a DMARC record such as `v=DMARC1; p=quarantine; rua=mailto:dmarc@your-domain.eu`. Without these, inquiry notifications may land in spam.

### 4. Ongoing deployments

- **Every schema change** comes with a committed migration (CI enforces this). Apply it before the new code goes live: `DATABASE_URL=<direct URI> npm run db:migrate`. Migrations are additive by convention; for destructive changes, deploy in two steps (stop using the column, then drop it).
- **Rollback:** Vercel → Deployments → previous deployment → *Promote to Production* (instant). Database changes are not rolled back automatically — that is why destructive migrations are split into two releases.
- **Monitoring:** point an uptime monitor (e.g. Better Stack, UptimeRobot) at `https://your-domain.eu/api/health` — it checks the database too. Vercel → Logs shows runtime errors; errors never reach visitors in detail.

---

## B. Docker on an EU VPS

1. Server: Ubuntu 24.04 LTS, 2 GB RAM, in an EU location. Enable automatic security updates and a firewall allowing only 22, 80 and 443.
2. Install Docker and copy the repository (or pull it).
3. Create `.env` from `.env.example` with production values (`SITE_URL`, `SESSION_SECRET`, `SMTP_*`, `TRUST_PROXY=true`, `STORAGE_DRIVER=local`, a strong database password in `DATABASE_URL`).
4. Start PostgreSQL and the app:
   ```bash
   docker compose --profile app up -d --build
   docker compose run --rm app node_modules/.bin/tsx scripts/migrate.ts
   docker compose run --rm -it app node_modules/.bin/tsx scripts/create-admin.ts --email you@your-domain.eu --name "Your Name"
   ```
5. Put Caddy in front for automatic HTTPS (`/etc/caddy/Caddyfile`):
   ```
   your-domain.eu, www.your-domain.eu {
     reverse_proxy 127.0.0.1:3000
     encode zstd gzip
   }
   ```
6. Schedule clean-up: a daily cron entry
   `17 3 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain.eu/api/cron/maintenance`.
7. Change the default database password in `docker-compose.yml` before going live, and never publish port 5432 publicly (the compose file binds it to 127.0.0.1).

---

## Backups

| What | How | Frequency / retention | Your action |
| --- | --- | --- | --- |
| Database (Supabase Pro) | Managed physical backups | Daily, kept 7 days | Test a restore once before launch |
| Database (independent copy) | [`.github/workflows/backup.yml`](../.github/workflows/backup.yml): `pg_dump`, encrypted with GPG, stored as a private workflow artifact | Weekly, kept 30 days | Add `BACKUP_DATABASE_URL` and `BACKUP_PASSPHRASE` repository secrets to enable; keep the passphrase offline |
| Images | Enable versioning / lifecycle rules on the bucket (or back up the `media` Docker volume) | — | Configure in your storage provider |
| Code and configuration | Git (GitHub) | Every change | Keep environment variables documented in your password manager |

Without the two secrets the backup workflow does nothing. Artifacts of a **public** repository are only downloadable by people with repository access, and the dump is encrypted regardless.

**Restore procedure**

1. Create an empty database (new Supabase project or `createdb`).
2. Decrypt and restore:
   ```bash
   gpg --decrypt ravenwebstudio-YYYYMMDD.dump.gpg > restore.dump
   pg_restore --no-owner --no-privileges --dbname "<new DATABASE_URL>" restore.dump
   ```
3. `DATABASE_URL=<new URL> npm run db:migrate` (no-op if already current).
4. Point the application's `DATABASE_URL` at the restored database and redeploy.
5. Verify: sign in, check inquiries and published content, submit a test inquiry.

For the VPS set-up, run nightly `docker compose exec -T db pg_dump -U postgres -Fc ravenwebstudio | gpg --symmetric --batch --passphrase-file /root/backup.pass > /backups/$(date +%F).dump.gpg` and copy the files off-site (e.g. an EU object-storage bucket), keeping at least 14 days.

---

## Environments

| Environment | Database | Sample content | Indexing |
| --- | --- | --- | --- |
| Local | Docker PostgreSQL | `SHOW_SAMPLE_CONTENT=true` | n/a |
| CI | Ephemeral PostgreSQL service container | `true` | n/a |
| Preview (Vercel) | Separate database/branch | your choice | `robots.txt` disallows everything when `VERCEL_ENV` ≠ production |
| Production | Production database | `false` | Allowed; submit the sitemap in Search Console |
