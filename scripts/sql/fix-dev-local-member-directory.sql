-- DEV ONLY — not part of versioned Supabase migrations.
-- Optional one-off if you use scripts/seed-dev.js and the Members Directory is empty for @dev.local users.
-- Prefer: npm run db:sync-members (updates org_memberships + profiles from Node).
--
-- Paste into Supabase Dashboard → SQL Editor (postgres role), or: psql < scripts/sql/fix-dev-local-member-directory.sql
--
-- Scope: ONLY auth users with email ILIKE '%@dev.local'. TIPA org id = types/database.ts TIPA_ORG_ID.

-- 1) Backfill user_profiles for @dev.local missing a row
INSERT INTO public.user_profiles (
  id,
  user_id,
  email,
  full_name,
  first_name,
  last_name,
  notify_replies
)
SELECT
  gen_random_uuid(),
  u.id,
  lower(trim(u.email)),
  COALESCE(
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
    u.email
  ),
  NULLIF(trim(COALESCE(u.raw_user_meta_data->>'first_name', '')), ''),
  NULLIF(trim(COALESCE(u.raw_user_meta_data->>'last_name', '')), ''),
  true
FROM auth.users u
WHERE u.email ILIKE '%@dev.local'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.user_id = u.id
  );

-- 2) Approve pending memberships for @dev.local (any org)
UPDATE public.org_memberships om
SET
  status = 'approved',
  updated_at = now()
FROM auth.users u
WHERE om.user_id = u.id
  AND u.email ILIKE '%@dev.local'
  AND om.status = 'pending';

-- 3) Ensure TIPA membership + approved for every @dev.local user
INSERT INTO public.org_memberships (
  user_id,
  org_id,
  role,
  status,
  membership_level
)
SELECT
  u.id,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'member',
  'approved',
  COALESCE(
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'membership_level', '')), ''),
    'Full'
  )
FROM auth.users u
WHERE u.email ILIKE '%@dev.local'
ON CONFLICT (user_id, org_id) DO UPDATE SET
  status = 'approved',
  updated_at = now();
