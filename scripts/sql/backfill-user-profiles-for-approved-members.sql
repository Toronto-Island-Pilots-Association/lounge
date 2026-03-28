-- One-off data repair: member_profiles = org_memberships ⋈ user_profiles (INNER JOIN).
-- Any approved membership without a user_profiles row is invisible in the Members Directory.
--
-- Inserts identity rows from auth.users (same shape as handle_new_user trigger).
-- Safe to re-run: only inserts where no profile exists for that user_id.
--
-- Run in Supabase SQL Editor (postgres) or: supabase db execute / MCP execute_sql

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
WHERE u.email IS NOT NULL
  AND trim(u.email) <> ''
  AND EXISTS (
    SELECT 1
    FROM public.org_memberships om
    WHERE om.user_id = u.id
      AND om.status = 'approved'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.user_id = u.id
  );
