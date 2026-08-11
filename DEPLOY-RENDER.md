# Sharing Hazel Glen Care with your client on Render

This puts a live, shareable link in front of your client — no need for your own
computer to stay on. It uses Render's **free** tier (a Postgres database + two
web services). Free services sleep after ~15 min idle, so the first click after
a quiet spell takes ~30–60 seconds to wake — tell your client that's normal.

## 1. Put the code on GitHub
Render deploys from a Git repo.
1. Create a new (private is fine) repository on GitHub.
2. Push this project to it:
   ```
   git init
   git add .
   git commit -m "Hazel Glen Care"
   git branch -M main
   git remote add origin https://github.com/<you>/hazel-glen-care.git
   git push -u origin main
   ```

## 2. Create the services from the Blueprint
1. Sign in at https://render.com (free account).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub and pick the repo. Render reads `render.yaml` and shows:
   a database (`hazel-glen-db`), the API (`hazel-glen-api`) and the web app
   (`hazel-glen-web`).
4. Click **Apply**. Render builds all three (first build takes a few minutes).

## 3. Make the two URLs match
Render gives each service a URL like `https://hazel-glen-web.onrender.com`.
The blueprint assumes exactly those names. **If Render added a random suffix**
(because a name was taken), fix two values so the frontend and backend can talk:

- On **hazel-glen-web** → Environment → `NEXT_PUBLIC_API_URL` =
  `https://<your-api-url>/api`  → save → **Manual Deploy → Clear build cache & deploy**.
- On **hazel-glen-api** → Environment → `CORS_ORIGIN` =
  `https://<your-web-url>`  → save (it restarts automatically).

If the names came through clean, you can skip this step.

## 4. Load the demo data (once)
1. Open **hazel-glen-api** → **Shell** (left menu).
2. Run:
   ```
   npx prisma db seed
   ```
   This creates the demo admin, staff, clients, shifts, timesheets and job
   applications so the app looks real.

## 5. Share it
Send your client the **web** URL, e.g. `https://hazel-glen-web.onrender.com`,
with these demo logins (password `Password123!` for all):

- **Admin:**  admin@hazelglencare.co.za
- **Staff:**  thandi@hazelglencare.co.za
- **Client:** client@example.co.za

They can browse the public site, open the chat widget, and sign in to the admin
dashboard, staff portal and client portal.

## Good to know
- **Free tier sleeps.** First visit after idle is slow to wake — that's expected.
- **Uploads are temporary.** Clock-in selfies save to a temporary disk on the
  free plan and are cleared on redeploy. Fine for a demo; for production add a
  Render Disk (paid) or object storage.
- **Free Postgres expires after ~30 days.** Perfect for a preview; not for the
  real launch.
- **Re-seeding** (`npx prisma db seed`) resets the demo data to a clean state
  any time you want a fresh demo.

When you're ready for the real production launch (custom domain, always-on,
persistent uploads, backups), the same repo deploys to Render's paid tier or any
Docker host — just say the word and I'll prepare that config.
