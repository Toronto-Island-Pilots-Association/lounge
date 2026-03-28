# Archived migration SQL (reference only)

Historical copies of the chain folded into  
`migrations/20260329100000_clublounge_multitenant_consolidated.sql`.

**Supabase CLI** only runs `*.sql` under `supabase/migrations/` — nothing here is applied by `db push` / `db reset`.

## Layout

| Folder | Contents |
|--------|----------|
| **`pre_multi_tenancy/`** | Migrations that ran **before** the big multi-tenancy squash (`20250303*`, `20250307*`). |
| **`multi_tenancy/`** | Squashed multi-tenancy (`20260323000001_*`) plus follow-on org/Stripe/storage SQL and the **old demo-org migration file** (`20260323000006_seed_demo_org.sql`) for diffing only. |

**Live demo bootstrap** (org + `public_access`) is in **`../seeds/demo_org.sql`**. **Full** demo data is **`npm run db:seed-demo-org`** (`scripts/seed-demo-org.ts`).

Do not copy these back into `supabase/migrations/` unless you intend duplicate applies.
