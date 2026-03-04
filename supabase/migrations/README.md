# Supabase migrations

Run these in order against your existing database to apply schema changes without dropping tables or losing data.

## How to run

**Option A – Supabase Dashboard**  
1. Open your project → SQL Editor.  
2. Paste the contents of the latest migration file.  
3. Run it.

**Option B – Supabase CLI**  
From the project root:

```bash
supabase db push
```

Or link the project and run migrations:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option C – Manual**  
Connect to your Postgres database with `psql` or any client and execute the `.sql` file.

## Migrations

- `20250303120000_add_invited_at_to_user_profiles.sql` – Adds `invited_at` to `user_profiles` and updates the signup trigger to set it for invited users. Safe to run on existing DBs (no data loss).
