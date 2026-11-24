---
name: prisma-change
description: Change this project's PostgreSQL data model with Prisma, migrations, and application queries.
---

# Change the Prisma data model

- Inspect `prisma/schema.prisma`, recent migration directories, and the code that reads or writes the affected models before editing.
- Update the Prisma schema and create a new migration under `prisma/migrations/` that preserves existing data. Do not rewrite applied migrations.
- Treat `npm run prisma:reset` and destructive SQL as data loss: never run them unless the user explicitly asks and the target database is confirmed to be disposable.
- Update related queries, selects, types, and focused tests. Keep authorization and user scoping in server-side code.
- Regenerate the client with the existing Prisma workflow when needed. Run focused tests and `npx tsc --noEmit --incremental false`; if routes or server rendering changed, also run `npm run build:backend`.
- Do not change package scripts unless requested. Use `prisma migrate deploy` for deployment-style application of committed migrations; do not use development migration commands against production.
