# Supabase migrations

## Current layout

- **`20260329100000_clublounge_multitenant_consolidated.sql`** — single migration containing the full multi-tenant schema path (legacy pre-multi-tenant deltas + org split + org branding storage + Stripe flags). Apply with CLI or SQL Editor on a **fresh** database, or use **`supabase db reset`** locally.

**Demo / local data** is **not** in migrations: **`../seeds/demo_org.sql`** — bootstrap only (org + `public_access`). Full demo (users, threads, events, …) is **`npm run db:seed-demo-org`** → `scripts/seed-demo-org.ts`. See **`../seeds/README.md`**.

**Historical per-step SQL** (not applied by the CLI): **`../migrations_archive/`**  
- **`pre_multi_tenancy/`** — `20250303*`, `20250307*` (before the squash)  
- **`multi_tenancy/`** — squashed file, follow-on migrations, and **`20260323000006_seed_demo_org.sql`** (reference only; live seed is `seeds/demo_org.sql`)

## How to run

**Supabase CLI** (recommended):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Local reset** (migrations + seed):

```bash
supabase db reset
```

**Dashboard** — paste the consolidated migration in SQL Editor only on empty / known-compatible databases; prefer `db push` for history tracking.

## Existing Supabase projects

If a remote database **already recorded** the old per-file migrations in `supabase_migrations.schema_migrations`, replacing the repo with this single file will **not** match CLI history. Options: **new project** + `db push`, or use Supabase **migration repair** / manual alignment (advanced). Do not delete old migration files on a branch that still deploys to databases that applied them without a coordinated cutover.
