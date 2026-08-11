# Hazel Glen Care — Production launch (Render)

This is the real, always-on deployment: no cold-start sleep, a backed-up
database, persistent uploads, proper migrations, and a real admin login (no demo
data). It builds on the same repo as the preview.

## What's different from the preview
| | Preview (`render.yaml`) | Production (`render.production.yaml`) |
|---|---|---|
| Services | free (sleep after idle) | `starter` — always on |
| Database | free (expires ~30 days) | `basic_256mb` — persistent + daily backups |
| Uploads (selfies) | temporary | persistent 5 GB disk |
| Schema | `prisma db push` | `prisma migrate deploy` |
| Data | demo seed | your real admin only |
| Registration | open-ish | admin-only (hardened) |

## 1. Create the initial database migration (once, locally)
Production uses versioned migrations instead of pushing the schema.
```
cd backend
npx prisma migrate dev --name init        # creates prisma/migrations/…
git add prisma/migrations && git commit -m "Initial migration"
git push
```
(If you skip this, the blueprint still works — it falls back to a schema push on
first deploy — but committing migrations is the correct production practice and
makes future schema changes safe.)

## 2. Point Render at the production blueprint
Render only reads a file literally named `render.yaml`. Either:
- **Simplest:** copy `render.production.yaml` over `render.yaml`, commit, push; or
- Keep a dedicated `production` branch where `render.yaml` = the production file.

Then in Render: **New + → Blueprint → pick the repo/branch → Apply.**

## 3. Set the two URLs
After the services exist, set these (they're intentionally blank in the blueprint):
- **hazel-glen-web-prod** → `NEXT_PUBLIC_API_URL` = `https://<api-url-or-domain>/api`
  → save → **Manual Deploy → Clear build cache & deploy** (it's baked in at build).
- **hazel-glen-api-prod** → `CORS_ORIGIN` = `https://<web-url-or-domain>` → save.

## 4. Create your real admin (once, no demo data)
Open **hazel-glen-api-prod → Shell** and run — with your own values:
```
ADMIN_EMAIL="you@hazelglencare.co.za" ADMIN_PASSWORD="a-long-strong-password" node prisma/create-admin.js
```
Sign in at your web URL `/login`, then add staff and clients from the **Team**
page. (Do **not** run `prisma db seed` in production — that's the demo dataset.)

## 5. Custom domains (optional but recommended)
In each service → **Settings → Custom Domains**, add e.g.
`app.hazelglencare.co.za` (web) and `api.hazelglencare.co.za` (api), and update
your DNS as Render instructs. Then update `NEXT_PUBLIC_API_URL` and
`CORS_ORIGIN` to the custom domains and redeploy the web service. Render issues
free HTTPS certificates automatically.

## 6. Before you go live — checklist
- [ ] `JWT_SECRET` is auto-generated (don't reuse the preview's).
- [ ] Real admin created; demo accounts are **not** present (never seeded here).
- [ ] `CORS_ORIGIN` = exactly your web domain (no trailing slash).
- [ ] Replace the placeholder phone/email/WhatsApp/social links with the real ones.
- [ ] Confirm a test clock-in selfie persists after a redeploy (disk working).
- [ ] Take note: database backups are automatic on the paid plan; test a restore.

## Security — already hardened
- **Registration is admin-only.** The public API no longer allows self sign-up;
  people are added from the Team page.
- **Login is rate-limited.** Max 8 attempts per 15 minutes per IP + email to slow
  brute-force (returns HTTP 429 with `Retry-After`).
- **Attendance selfies are access-controlled.** Clock-in/out photos (biometric
  personal information under POPIA) are no longer served as public static files —
  they stream through an **admin-only** authenticated route with `Cache-Control:
  private, no-store`. The admin UI fetches them with the admin's token. Profile
  avatars remain public static files (low sensitivity).

## Further hardening (optional)
- **Backups off Render**: schedule a periodic `pg_dump` to object storage for an
  extra copy beyond Render's managed backups. I can script this.
- **Object storage for uploads**: for scale/redundancy, move selfies to S3-style
  storage with short-lived signed URLs instead of the local disk. I can build it.

When you're ready, I can also set up a staging environment (a second, cheaper
copy for testing changes before they hit production).
