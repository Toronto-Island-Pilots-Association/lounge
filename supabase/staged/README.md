# Staged `lounge-dev` migration drafts

These files are a safer operational breakdown of the current multi-tenant
migration work for rehearsing on the legacy single-tenant `lounge-dev` database.

They are **draft execution aids only**:

- not part of Supabase CLI migration history
- not applied by `supabase db push`
- not a replacement for `supabase/migrations/`

Use them to rehearse the migration in checkpoints before touching `lounge`
production.

## Order

1. `00_baseline.sql`
2. `01_additive_scaffold.sql`
3. `02_seed_tipa_org.sql`
4. `03_backfill_org_links.sql`
5. `04_copy_memberships.sql`
6. `05_tipa_parity.sql`
7. `06_validation_queries.sql`
8. Verify Vercel environment + hostname mapping
9. Deploy branch code
10. `07_post_deploy_checks.md`
11. `08_destructive_cleanup.sql` only after validation

## Safety model

- `00` to `06` are the pre-deploy preparation and verification phases
- `08` is intentionally destructive and should be restore-only rollback territory

## Important invariant

TIPA dues must remain on the legacy direct Stripe path.

Do not convert TIPA to Stripe Connect as part of this rehearsal.

## Environment and domain split

This migration is not complete unless deployment routing is also correct.

- `Production`
  - serves `lounge.tipa.ca`
  - points to the `lounge` Supabase project
- `dev`
  - serves `lounge-dev.tipa.ca`
  - points to the `lounge-dev` Supabase project
- `Preview`
  - should point to a separate multi-tenant-safe test project such as `clublounge-dev`
  - must not share the `lounge` production database

Before rehearsal or cutover, verify:

- Vercel environment variables are correct for `Production`, `dev`, and `Preview`
- the TIPA org row in each database has the matching `custom_domain`
  - prod: `lounge.tipa.ca`
  - dev: `lounge-dev.tipa.ca`
- the hostname resolves to the deployment you expect before testing app behavior
