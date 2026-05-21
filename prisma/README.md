Migration workflow

This project uses Prisma for database schema management.

Recommended approach for production:

1. Create a migration locally (only when you are developing schema changes):

   ```bash
   npx prisma migrate dev --name describe-change
   git add prisma/migrations
   git commit -m "prisma: add migration describe-change"
   git push
   ```

2. In CI / deployment, apply migrations:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

Fallback for existing databases without migration history:

- The CI workflow will attempt `npx prisma migrate deploy` first. If it fails (no migrations recorded), it will fall back to `npx prisma db push` which applies the current Prisma schema directly to the database.

Notes:
- `prisma db push` is convenient but does not produce a migration history. Prefer using `migrate dev` + `migrate deploy` for production.
- If your production DB is already in sync but has no migration history, you can:
  - Create migrations locally and then mark them applied in the production DB using `prisma migrate resolve --applied <migration-id>` OR
  - Use the current CI fallback (`db push`) until you can introduce migrations in a controlled maintenance window.
