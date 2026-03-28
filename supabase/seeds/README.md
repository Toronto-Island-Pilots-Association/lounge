# Database seeds

## Two-step demo tenant (`slug = demo`)

| Step | What runs | What you get |
|------|-----------|----------------|
| **1. Automatic** | `demo_org.sql` after migrations on **`supabase db reset`** | One org row (`Lakeside Sports Club`) + `public_access` so guests can browse. Enough for smoke tests that only need an org id. |
| **2. Full demo** | **`npm run db:seed-demo-org`** | Everything that ships on [demo.clublounge.app](https://demo.clublounge.app): `create_default_org_settings`, ~40 auth users + `user_profiles` + `org_memberships`, threads, comments, reactions, events + RSVPs, resources, `payments`. |

The TypeScript script **removes** any existing `slug = demo` org first, then rebuilds the full dataset (so run it after `db reset` if you want the complete picture).

```bash
supabase db reset
npm run db:seed-demo-org
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (e.g. in `.env.local`). Admin login is printed at the end of the script.

## Why not only SQL?

Auth accounts live in `auth.users`. Seeding them needs the **Admin API** (`auth.admin.createUser`), not plain SQL in `supabase/seeds/`. Same for realistic `created_by` / RSVP user links.

## Config

`config.toml` → `[db.seed].sql_paths` lists `./seeds/demo_org.sql` only. There is no built-in hook to run Node after reset; use the npm script for the full demo.

This folder is **not** `supabase/migrations/` — no version history.
