# 11 — Commit to GitHub & Deploy

This is a step-by-step guide to push Waailo HR to GitHub and deploy it for free:
**Vercel** (frontend) + **Render** (backend) + **Neon** (PostgreSQL).

> You run these commands — they need your accounts and credentials, which can't be
> automated for you. Everything is prepared (Dockerfiles, `.gitignore`, env examples).

## 1. Commit to GitHub

From the repo root (`waailo/`):

```bash
git init
git add .
git commit -m "Waailo HR: full HRMS (auth, attendance, leave, payroll, recruitment, performance)"
git branch -M main
```

`node_modules`, `.env`, build output and `.storage` are git-ignored, so no secrets or
dependencies are committed.

Create the GitHub repo and push — pick one:

**Option A — GitHub CLI (`gh`):**

```bash
gh repo create waailo-hr --private --source=. --remote=origin --push
```

**Option B — Manual:** create an empty repo at github.com (no README), then:

```bash
git remote add origin https://github.com/<your-username>/waailo-hr.git
git push -u origin main
```

## 2. Database — Neon (PostgreSQL)

1. Sign up at neon.tech (no credit card), create a project.
2. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`).
3. Keep it for the backend's `DATABASE_URL`.

## 3. Backend — Render (Web Service)

1. render.com → **New → Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Docker (Render auto-detects `backend/Dockerfile`), or Node with:
     - Build: `npm install && npx prisma generate && npm run build`
     - Start: `npx prisma migrate deploy && node dist/main.js`
3. **Environment variables:**
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | your Neon connection string |
   | `JWT_ACCESS_SECRET` | a long random string |
   | `JWT_REFRESH_SECRET` | a different long random string |
   | `CORS_ORIGIN` | your Vercel frontend URL (set after step 4; can update later) |
   | `NODE_ENV` | `production` |
   | `API_PREFIX` | `api/v1` |
   | `STORAGE_DRIVER` | `local` (documents are ephemeral on Render free — S3 is the next step) |
4. Deploy. Note the service URL, e.g. `https://waailo-api.onrender.com`.
5. **Seed once** (Render Shell, or run locally pointing `DATABASE_URL` at Neon):
   `npm run seed` — adds roles, statutory rates (incl. TDS) and the demo company.

> Render's free tier sleeps after 15 min idle (first request after that takes ~1 min to wake)
> and has an ephemeral filesystem — fine for testing; upgrade for always-on + persistent files.

## 4. Frontend — Vercel

1. vercel.com → **Add New → Project** → import your GitHub repo.
2. Settings:
   - **Root Directory:** `frontend`
   - Framework preset: **Next.js** (auto-detected)
3. **Environment variable:**
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://waailo-api.onrender.com/api/v1` (your Render URL + `/api/v1`) |
4. Deploy. Note the URL, e.g. `https://waailo-hr.vercel.app`.
5. Go back to Render and set `CORS_ORIGIN` to that Vercel URL, then redeploy the backend.

## 5. Verify

- Open the Vercel URL → the marketing homepage loads.
- **Create account** (or sign in with the seeded `demo-co` / `owner@demo.co` / `Password123!`
  if you seeded the demo company).
- The frontend calls the Render API, which reads/writes Neon.

## Production hardening (recommended before real users)

- **Document storage:** implement the S3 adapter (the `StoragePort` seam exists) so uploads
  persist — Render's free disk is wiped on restart.
- **Secrets:** use strong, unique JWT secrets (never the dev placeholders).
- **Rate limiting** on auth endpoints, **RLS** on the database, and **Sentry** for errors —
  see `docs/07` and `docs/08`.
- **Migrations** run automatically on each deploy via `prisma migrate deploy` in the start
  command / Dockerfile.

## CI (optional)

Add a GitHub Actions workflow that runs `npm run typecheck` + `npm test` for both `backend`
and `frontend` on every push, so broken builds never deploy. (Not included by default since
earlier the project was kept Git-free.)
