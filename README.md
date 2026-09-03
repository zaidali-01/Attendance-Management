# Attendance Al-Ismat Academy

Single-user attendance management system for Al-Ismat Academy, built with Next.js (App Router) and deployed on Vercel with a Postgres database.

## Features
- Manage students (CRUD) across classes 9, 10, 11, 12
- Record weekly attendance per student (start date, end date, total days, present days — absent days and percentage are calculated automatically)
- Generate a PDF attendance report for any student over a chosen date range, showing week-by-week attendance in a table plus an overall total

## Local setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD_HASH
npx prisma migrate dev --name init
npm run dev
```

Visit http://localhost:3000 and log in with `ADMIN_USERNAME` / the plaintext password you hashed into `ADMIN_PASSWORD_HASH`.

Generate a password hash with:
```bash
node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10).replace(/\$/g, '\\\$'))"
```
**Important:** Next.js expands `$VAR`-style patterns inside `.env` files, so every literal `$` in a bcrypt hash must be escaped as `\$` (the command above does this). Without escaping, the hash gets silently mangled and login will fail with no obvious error.

## Deployment (Vercel + free Postgres)

1. Push this repo to GitHub (already done — `github.com/zaidali-01/Attendance-Management`).
2. In your Vercel dashboard, create a new project and import that GitHub repo.
3. Before the first deploy, go to the project's **Storage** tab → **Create Database** → choose **Postgres** (Neon-backed, free tier). Vercel auto-injects `DATABASE_URL` (and related `POSTGRES_*` vars) into your project's environment variables.
4. In **Settings → Environment Variables**, add:
   - `NEXTAUTH_SECRET` — any long random string (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` — your production URL, e.g. `https://attendance-al-ismat-academy.vercel.app`
   - `ADMIN_USERNAME` — e.g. `admin`
   - `ADMIN_PASSWORD_HASH` — bcrypt hash generated as above, with `$` escaped as `\$`
5. Deploy. The `build` script runs `prisma migrate deploy` automatically before `next build`, so the database schema is created/updated on every deploy — no manual migration step needed.

## Branding
Theme color: mid-shade green (`#2e7d52`).
