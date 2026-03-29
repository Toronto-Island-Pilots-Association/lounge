# Lounge Migration Stages

This file is the cleaner reference for migrating the legacy single-tenant TIPA
database (`lounge` / `lounge-dev`) onto the multi-tenant branch.

It does **not** replace the active files under `supabase/migrations/`.
Those files remain the source of truth for Supabase CLI history.

## Why this exists

The active migration chain on this branch is safe for CLI history, but it is not
easy to reason about operationally:

- one large consolidated cutover migration
- several TIPA-specific corrective patches
- later feature migrations mixed in with migration-critical parity work

For `lounge-dev` rehearsal and eventual `lounge` production cutover, think
about the chain in these stages.

## Stage 0: Historical Source Material

Reference only. Nothing in `supabase/migrations_archive/` is applied by
`supabase db push`.

- `pre_multi_tenancy/*.sql`
- `multi_tenancy/*.sql`

These explain what got folded into the consolidated migration. They are useful
for debugging and cleanup planning, not for live execution.

## Stage 1: Core Tenant Cutover

This is the real migration.

- `20260329100000_clublounge_multitenant_consolidated.sql`

What it does:

- creates `organizations`
- seeds TIPA as the founding org
- adds `org_id` across tenant tables
- creates `org_memberships`
- copies legacy membership data out of `user_profiles`
- creates `member_profiles`
- rewires settings, plans, org billing fields, branding/storage/connect flags

Risk level: high

Notes:

- This is the only stage that transforms the single-tenant data model into the
  multi-tenant one.
- It is destructive in the sense that it drops legacy membership columns from
  `user_profiles` after copying them.
- Deploy app code together with this stage.

## Stage 2: Tenant Model Hardening

These are post-cutover structural fixes that make the tenant model more usable.

- `20260328130000_org_custom_domain_verified.sql`
- `20260328150000_drop_threads_category_check.sql`

What they do:

- add `custom_domain_verified` and reset trigger
- remove the hard DB category constraint so org-defined discussion categories can work

Risk level: low to medium

## Stage 3: TIPA Parity Restores

These migrations are about making migrated TIPA still feel like TIPA, but with
that behavior stored in org settings rather than hardcoded UI.

- `20260329110000_tipa_stripe_and_bylaws.sql`
- `20260329115000_signup_fields_tipa_only_aviation.sql`
- `20260329115500_signup_fields_strip_legacy_tipa.sql`
- `20260329120000_tipa_discussion_categories.sql`
- `20260329130000_tipa_restore_aviation_signup_fields.sql`

What they do:

- patch TIPA Stripe/bylaws/discussion settings
- normalize generic signup field defaults
- strip old aviation built-ins
- restore TIPA aviation/COPA questions as explicit stored custom fields
- restore TIPA discussion categories into DB settings

Risk level: medium

Notes:

- This stage matters a lot for `lounge-dev` rehearsal.
- The goal is not just "migration succeeded"; the goal is "migrated TIPA still
  has the expected member/admin experience."

## Stage 4: New Product Features

These are not required to prove the core migration works, but they are part of
the current branch behavior.

- `20260329140000_pages_table.sql`
- `20260329173000_add_editor_org_role.sql`

What they do:

- add org-managed public pages
- add `editor` as an org role and extend related policies

Risk level: medium

Notes:

- If you deploy the current branch, these are part of that behavior.
- If you were ever creating a minimal migration-only branch, these could be
  deferred behind the core tenant cutover.

## Stage 5: Content Seeds

These migrations are content, not schema.

- `20260329140001_tipa_pages_seed.sql`
- `20260329191500_seed_tipa_about_page.sql`

What they do:

- seed TIPA's public About page

Notes:

- `20260329140001_tipa_pages_seed.sql` is an older placeholder seed.
- `20260329191500_seed_tipa_about_page.sql` is the real content seed.
- Long-term cleanup should keep only the real seed in the canonical story.

## What To Run For `lounge-dev`

If the goal is "rehearse the real migration from current single-tenant TIPA to
multi-tenant TIPA", the important stages are:

1. Stage 1: core tenant cutover
2. Stage 2: tenant hardening
3. Stage 3: TIPA parity restores

Stage 4 and Stage 5 should be included if you are rehearsing the **current
branch as deployed**, not just the data transformation.

## Deployment Checklist

DB migration alone is not enough. The domain and deployment split must match the
database split:

- `lounge.tipa.ca` should stay on the production deployment using the `lounge` DB
- `lounge-dev.tipa.ca` should point to the `dev` deployment using the `lounge-dev` DB
- branch previews should use a separate multi-tenant-safe test DB, not `lounge`

In each DB, the TIPA org row must also have the matching `custom_domain`:

- prod: `lounge.tipa.ca`
- dev: `lounge-dev.tipa.ca`

## Cleanup Candidates

These files are useful for history, but they are signs that the active chain is
still carrying branch-era corrective patches:

- `20260329110000_tipa_stripe_and_bylaws.sql`
- `20260329115500_signup_fields_strip_legacy_tipa.sql`
- `20260329140001_tipa_pages_seed.sql`

Long-term, the clean target should be:

1. one core cutover migration
2. one tenant-hardening follow-up
3. one TIPA parity/settings follow-up
4. optional feature migrations
5. final content seed

Do not rewrite the live `supabase/migrations/` history until all remote
projects using this branch have been migrated or intentionally repaired.
