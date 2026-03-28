# Multi-tenancy + follow-on migrations (reference)

- **`20260323000001_squashed_multi_tenancy_after.sql`** — organizations, `org_id`, `org_memberships`, `member_profiles`, etc.
- **`20260323000002` … `20260328120100`** — Stripe billing columns, grants, labels, trial, favicon, branding bucket, Connect flags.
- **`20260323000006_seed_demo_org.sql`** — **historical only**; replaced by **`seeds/demo_org.sql`** (bootstrap) + **`scripts/seed-demo-org.ts`** (full dataset).
