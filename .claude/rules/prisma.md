---
paths:
  - '**/prisma/**'
  - '**/schema.prisma'
  - apps/backend/prisma.config.ts
---

# Prisma rules

Prisma 7. The config file is `apps/backend/prisma.config.ts`, in the backend
root — not inside `prisma/`.

**Every schema change needs a committed migration.** Deploys run
`prisma migrate deploy`, which applies what exists and never generates. A schema
edit without its migration passes CI and fails in production.

```bash
cd apps/backend
pnpm prisma:migrate        # generate + apply in dev
npx prisma migrate deploy  # what production runs
npx prisma generate        # after any schema edit
```

Read the generated SQL before committing it. The recurring hazards: adding a
`NOT NULL` column with no default fails on a non-empty table; a rename emits
drop-then-add and loses the data, so it needs expand / backfill / contract; and
`CREATE INDEX` locks writes, which Prisma does not emit `CONCURRENTLY` for.

**Columns are snake_case in Postgres via `@map`, camelCase in TypeScript.** Keep
that convention on anything new.

**Indexes must match query order.** The two composite indexes on `Game` lead with
`userId`; a query that filters on something else first uses neither.

**Type errors about fields that clearly exist** mean the generated client is
stale. Run `prisma generate`.

Connections go through the Supabase pooler: transaction pooling, no session
state, a low connection ceiling. Never hold a transaction open across slow work
such as an engine call.
