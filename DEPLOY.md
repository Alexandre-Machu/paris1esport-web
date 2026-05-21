Deployment checklist (GitHub Actions + Vercel)

Before CI can run builds that access your database, add the following environment variables:

1) GitHub repository secrets (for CI jobs)
   - `DATABASE_URL` = your Postgres connection string (postgresql://user:pass@host:5432/dbname)

   Steps:
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions → New repository secret
   - Add `DATABASE_URL` with your production database URL

2) Vercel environment variables (for runtime and Vercel builds)
   - In your Vercel project settings → Environment Variables, add:
     - `DATABASE_URL` (same as above)

Notes
- The CI workflow prefers versioned migrations (`npx prisma migrate deploy`). It will fall back to `npx prisma db push` only if `migrate deploy` cannot run.
- If your production database already contains the schema but has no Prisma migration history, follow the baseline steps in `prisma/README.md` to mark the initial migration as applied.

If you want me to automate adding a Vercel deployment step in GitHub Actions, tell me and I'll prepare the workflow. You'll need to add the following GitHub secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Once the secrets are added, pushing to `main` will allow CI to run migrations and build successfully.
