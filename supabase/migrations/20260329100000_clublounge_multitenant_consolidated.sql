-- =============================================================================
-- ClubLounge — consolidated multi-tenant schema (single migration)
-- =============================================================================
-- Replaces former chain: 20250303*, 20250307*, 20260323000001_squashed_*,
--   20260323000002–00005, 20260328000007, 20260328120000, 20260328120100.
-- Original files preserved for reference:
--   supabase/migrations_archive/pre_multi_tenancy/   (202503* before squash)
--   supabase/migrations_archive/multi_tenancy/       (squash + follow-ons + old demo migration SQL)
-- Demo bootstrap (db reset): supabase/seeds/demo_org.sql — full demo: npm run db:seed-demo-org
--
-- PREREQUISITE: expects legacy public tables to already exist (user_profiles,
-- threads, comments, resources, events, event_rsvps, reactions, payments,
-- settings). Use a restored/cloned DB, not an empty local DB, unless you add
-- a prior bootstrap migration.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migration: add invited_at to user_profiles
-- Safe: ADD COLUMN IF NOT EXISTS does not drop data or break existing rows.
-- Existing rows get NULL for invited_at; new invites set it via app or trigger.

-- 1. Add column (idempotent)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- 2. Update trigger function so new signups get invited_at from auth metadata
--    (CREATE OR REPLACE does not drop the trigger or affect existing data)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
  v_pilot_license_type TEXT;
  v_aircraft_type TEXT;
  v_call_sign TEXT;
  v_how_often_fly_from_ytz TEXT;
  v_how_did_you_hear TEXT;
  v_role TEXT;
  v_membership_level TEXT;
  v_member_number TEXT;
  v_is_student_pilot BOOLEAN;
  v_flight_school TEXT;
  v_instructor_name TEXT;
BEGIN
  v_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  v_first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  v_last_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_pilot_license_type := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'pilot_license_type', '')), '');
  v_aircraft_type := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'aircraft_type', '')), '');
  v_call_sign := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'call_sign', '')), '');
  v_how_often_fly_from_ytz := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'how_often_fly_from_ytz', '')), '');
  v_how_did_you_hear := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'how_did_you_hear', '')), '');
  v_role := COALESCE(NULLIF(LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', ''))), ''), 'member');
  IF v_role NOT IN ('member', 'admin') THEN
    v_role := 'member';
  END IF;
  v_membership_level := COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'membership_level', '')), ''), 'Associate');
  IF v_membership_level NOT IN ('Full', 'Student', 'Associate', 'Corporate', 'Honorary') THEN
    v_membership_level := 'Associate';
  END IF;
  v_member_number := public.generate_member_number();
  v_is_student_pilot := COALESCE((NEW.raw_user_meta_data->>'is_student_pilot')::boolean, false);
  v_flight_school := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'flight_school', '')), '');
  v_instructor_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'instructor_name', '')), '');

  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    pilot_license_type,
    aircraft_type,
    call_sign,
    how_often_fly_from_ytz,
    how_did_you_hear,
    role,
    membership_level,
    member_number,
    status,
    is_student_pilot,
    flight_school,
    instructor_name,
    invited_at
  )
  VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    v_full_name,
    v_first_name,
    v_last_name,
    v_phone,
    v_pilot_license_type,
    v_aircraft_type,
    v_call_sign,
    v_how_often_fly_from_ytz,
    v_how_did_you_hear,
    v_role,
    v_membership_level,
    NULL,
    'pending',
    v_is_student_pilot,
    v_flight_school,
    v_instructor_name,
    CASE WHEN (NEW.raw_user_meta_data->>'invited_by_admin') = 'true' OR (NEW.raw_user_meta_data->>'invited_by_member') = 'true' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add image_urls to comments (optional array of image URLs, same pattern as threads)
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT NULL;

COMMENT ON COLUMN comments.image_urls IS 'Optional array of image URLs (e.g. from storage); max 3 recommended.';

-- Add 'introduce_yourself' to threads category CHECK constraint
ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_category_check;
ALTER TABLE threads ADD CONSTRAINT threads_category_check CHECK (
  category IN (
    'introduce_yourself',
    'aircraft_shares',
    'instructor_availability',
    'gear_for_sale',
    'flying_at_ytz',
    'general_aviation',
    'training_safety_proficiency',
    'wanted',
    'building_a_better_tipa',
    'other'
  )
);

-- In-app notifications for thread replies and @mentions
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reply', 'mention')),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_thread_id ON notifications(thread_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own notifications (create only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON notifications FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Function to create notification rows when a comment is inserted.
-- Runs as definer so it can insert for any user_id.
CREATE OR REPLACE FUNCTION public.create_comment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_author_id UUID;
  v_mentioned_ids TEXT[] := ARRAY[]::TEXT[];
  v_match TEXT[];
  v_content TEXT := COALESCE(NEW.content, '');
BEGIN
  -- Get thread author
  SELECT created_by INTO v_thread_author_id
  FROM threads WHERE id = NEW.thread_id;

  -- Extract mentioned user IDs: @[Name](userId) -> capture userId
  FOR v_match IN SELECT (regexp_matches(v_content, '@\[[^\]]+\]\(([^)]+)\)', 'g'))
  LOOP
    IF v_match[1] IS NOT NULL AND v_match[1] <> NEW.created_by::TEXT THEN
      v_mentioned_ids := array_append(v_mentioned_ids, v_match[1]);
    END IF;
  END LOOP;
  v_mentioned_ids := ARRAY(SELECT DISTINCT unnest(v_mentioned_ids));

  -- Notify mentioned users (type = mention)
  IF array_length(v_mentioned_ids, 1) > 0 THEN
    INSERT INTO notifications (user_id, type, thread_id, comment_id, actor_id)
    SELECT u::UUID, 'mention', NEW.thread_id, NEW.id, NEW.created_by
    FROM unnest(v_mentioned_ids) AS u;
  END IF;

  -- Notify thread author (if not the commenter and not already mentioned)
  IF v_thread_author_id IS NOT NULL
     AND v_thread_author_id <> NEW.created_by
     AND NOT (v_thread_author_id::TEXT = ANY(v_mentioned_ids)) THEN
    INSERT INTO notifications (user_id, type, thread_id, comment_id, actor_id)
    VALUES (v_thread_author_id, 'reply', NEW.thread_id, NEW.id, NEW.created_by);
  END IF;

  -- Notify previous commenters (reply), excluding commenter, thread author, and mentioned
  INSERT INTO notifications (user_id, type, thread_id, comment_id, actor_id)
  SELECT DISTINCT c.created_by, 'reply', NEW.thread_id, NEW.id, NEW.created_by
  FROM comments c
  WHERE c.thread_id = NEW.thread_id
    AND c.id <> NEW.id
    AND c.created_by IS NOT NULL
    AND c.created_by <> NEW.created_by
    AND (v_thread_author_id IS NULL OR c.created_by <> v_thread_author_id)
    AND NOT (c.created_by::TEXT = ANY(v_mentioned_ids));

  RETURN NEW;
END;
$$;

-- Create trigger only if it does not exist (non-destructive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'comments' AND t.tgname = 'trigger_create_comment_notifications'
  ) THEN
    CREATE TRIGGER trigger_create_comment_notifications
      AFTER INSERT ON comments
      FOR EACH ROW
      EXECUTE FUNCTION public.create_comment_notifications();
  END IF;
END
$$;

COMMENT ON TABLE notifications IS 'In-app notifications for Hangar Talk replies and @mentions';

-- Add fields to track invite reminder sends (rate limit: 24h cooldown, max 3 reminders)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_profiles.last_reminder_sent_at IS 'When the last invitation reminder email was sent (for rate limiting).';
COMMENT ON COLUMN public.user_profiles.reminder_count IS 'Number of reminder emails sent after the initial invite (max 3).';

-- Add category to resources (Announcements: TIPA Newsletters, Airport Updates, Reminder, Other)
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
  CHECK (category IN ('tipa_newsletters', 'airport_updates', 'reminder', 'other'));

-- Add optional image and file attachment columns for announcement content
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT NULL;

COMMENT ON COLUMN resources.category IS 'Announcement category: tipa_newsletters, airport_updates, reminder, other';

-- Store Google OAuth refresh tokens for Calendar sync (encrypted at rest by app).
-- Used when users sign in with Google and grant calendar scope; enables auto-add on RSVP.
-- Requires: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET (same as Supabase Google provider),
-- GOOGLE_CALENDAR_ENCRYPTION_KEY (e.g. 32+ char secret), and Calendar scope in Google OAuth consent.
CREATE TABLE IF NOT EXISTS user_google_calendar_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_google_calendar_tokens_user_id ON user_google_calendar_tokens(user_id);

ALTER TABLE user_google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can insert/update/select only their own token (callback writes, RSVP flow reads via service role or same user)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_google_calendar_tokens'
      AND policyname = 'Users can manage own google calendar token'
  ) THEN
    CREATE POLICY "Users can manage own google calendar token"
      ON user_google_calendar_tokens
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON TABLE user_google_calendar_tokens IS 'Encrypted Google OAuth refresh tokens for adding RSVP events to user Google Calendar';

-- Squashed migrations (manual helper)
-- Covers: 20250322000000_add_multi_tenancy.sql through:
--   20250323000006_create_org_memberships.sql
--   20260323000000_add_tipa_org_id_defaults.sql
--
-- Intended use:
-- Apply this to a database that already ran all migrations BEFORE 20250322000000.
-- This file is NOT meant to replace Supabase's migration history automatically.
--
-- NOTE: We include CREATE EXTENSION IF NOT EXISTS "uuid-ossp" here because
-- 20250322000000_add_multi_tenancy.sql uses uuid_generate_v4().

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BEGIN: 20250322000000_add_multi_tenancy.sql
-- ============================================================
-- ============================================================
-- Multi-tenancy migration
-- Adds organizations table and org_id to every tenant table.
-- TIPA is seeded as the first organization.
-- ============================================================

-- Fixed UUID for TIPA org (stable across environments)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN

    -- --------------------------------------------------------
    -- 1. organizations table
    -- --------------------------------------------------------
    CREATE TABLE public.organizations (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name          TEXT NOT NULL,
      slug          TEXT UNIQUE NOT NULL,
      custom_domain TEXT UNIQUE,   -- e.g. 'lounge.tipa.ca'
      subdomain     TEXT UNIQUE,   -- e.g. 'tipa' → tipa.clublounge.app
      logo_url      TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

    -- Anyone can resolve org metadata (needed for middleware hostname lookup)
    CREATE POLICY "Public can view organizations"
      ON public.organizations FOR SELECT
      USING (true);

    CREATE TRIGGER update_organizations_updated_at
      BEFORE UPDATE ON public.organizations
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  END IF;
END $$;

-- --------------------------------------------------------
-- 2. Seed TIPA as the founding organization
-- --------------------------------------------------------
INSERT INTO public.organizations (id, name, slug, custom_domain, subdomain)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Toronto Island Pilots Association',
  'tipa',
  'lounge.tipa.ca',
  'tipa'
)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- 3. user_profiles: add user_id + org_id, rework PK
-- --------------------------------------------------------

-- Add new columns (nullable for backfill)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS org_id  UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill: existing rows all belong to TIPA; user_id = current id (= auth.users.id)
-- Disable triggers to avoid stale trigger functions referencing columns that may not exist yet.
ALTER TABLE public.user_profiles DISABLE TRIGGER USER;
UPDATE public.user_profiles
SET
  user_id = COALESCE(user_id, id),
  org_id  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE user_id IS NULL OR org_id IS NULL;
ALTER TABLE public.user_profiles ENABLE TRIGGER USER;

-- Drop the FK that tied user_profiles.id to auth.users.id
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- id is now a standalone surrogate UUID (keeps existing values for TIPA)
-- Add user_id FK to auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_user_id_fkey'
      AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enforce NOT NULL now that backfill is done
ALTER TABLE public.user_profiles
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN org_id  SET NOT NULL;

-- One profile per (user, org)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_org_unique;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_org_unique UNIQUE (user_id, org_id);

-- --------------------------------------------------------
-- 4. Add org_id to all tenant tables
-- --------------------------------------------------------

ALTER TABLE public.resources      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.events         ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.event_rsvps    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.threads        ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.comments       ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.reactions      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notifications  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.payments       ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill all to TIPA
DO $$
DECLARE tipa UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
  UPDATE public.resources     SET org_id = tipa WHERE org_id IS NULL;
  UPDATE public.events        SET org_id = tipa WHERE org_id IS NULL;
  UPDATE public.event_rsvps   SET org_id = tipa WHERE org_id IS NULL;
  UPDATE public.threads       SET org_id = tipa WHERE org_id IS NULL;
  UPDATE public.comments      SET org_id = tipa WHERE org_id IS NULL;
  UPDATE public.reactions     SET org_id = tipa WHERE org_id IS NULL;
  UPDATE public.notifications SET org_id = tipa WHERE org_id IS NULL;
  UPDATE public.payments      SET org_id = tipa WHERE org_id IS NULL;
END $$;

-- Enforce NOT NULL
ALTER TABLE public.resources      ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.events         ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.event_rsvps    ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.threads        ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.comments       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.reactions      ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.notifications  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.payments       ALTER COLUMN org_id SET NOT NULL;

-- --------------------------------------------------------
-- 5. settings: change PK from key → (key, org_id)
-- --------------------------------------------------------

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.settings
SET org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE org_id IS NULL;

ALTER TABLE public.settings ALTER COLUMN org_id SET NOT NULL;

-- Recreate composite PK
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE public.settings ADD PRIMARY KEY (key, org_id);

-- --------------------------------------------------------
-- 6. Indexes
-- --------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id     ON public.user_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id    ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_org_id         ON public.resources(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id            ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_org_id       ON public.event_rsvps(org_id);
CREATE INDEX IF NOT EXISTS idx_threads_org_id           ON public.threads(org_id);
CREATE INDEX IF NOT EXISTS idx_comments_org_id          ON public.comments(org_id);
CREATE INDEX IF NOT EXISTS idx_reactions_org_id         ON public.reactions(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id     ON public.notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id          ON public.payments(org_id);

-- --------------------------------------------------------
-- 7. generate_member_number: scope to org
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_member_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(member_number AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.user_profiles
  WHERE org_id = p_org_id
    AND member_number IS NOT NULL
    AND member_number ~ '^[0-9]+$'
    AND LENGTH(member_number) <= 6;

  RETURN LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Keep old signature as fallback during transition (uses TIPA org)
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS TEXT AS $$
BEGIN
  RETURN public.generate_member_number('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- 8. assign_member_number trigger: use org-scoped function
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_member_number_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (NEW.member_number IS NULL OR NEW.member_number = '')
     AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    NEW.member_number := public.generate_member_number(NEW.org_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------
-- 9. handle_new_user trigger: include user_id + org_id
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name             TEXT;
  v_first_name            TEXT;
  v_last_name             TEXT;
  v_phone                 TEXT;
  v_pilot_license_type    TEXT;
  v_aircraft_type         TEXT;
  v_call_sign             TEXT;
  v_how_often_fly_from_ytz TEXT;
  v_how_did_you_hear      TEXT;
  v_role                  TEXT;
  v_membership_level      TEXT;
  v_is_student_pilot      BOOLEAN;
  v_flight_school         TEXT;
  v_instructor_name       TEXT;
  v_org_id                UUID;
BEGIN
  v_full_name             := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  v_first_name            := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  v_last_name             := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  v_phone                 := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_pilot_license_type    := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'pilot_license_type', '')), '');
  v_aircraft_type         := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'aircraft_type', '')), '');
  v_call_sign             := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'call_sign', '')), '');
  v_how_often_fly_from_ytz := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'how_often_fly_from_ytz', '')), '');
  v_how_did_you_hear      := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'how_did_you_hear', '')), '');
  v_is_student_pilot      := COALESCE((NEW.raw_user_meta_data->>'is_student_pilot')::BOOLEAN, false);
  v_flight_school         := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'flight_school', '')), '');
  v_instructor_name       := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'instructor_name', '')), '');

  v_role := COALESCE(NULLIF(LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', ''))), ''), 'member');
  IF v_role NOT IN ('member', 'admin') THEN v_role := 'member'; END IF;

  v_membership_level := COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'membership_level', '')), ''), 'Associate');
  IF v_membership_level NOT IN ('Full', 'Student', 'Associate', 'Corporate', 'Honorary') THEN
    v_membership_level := 'Associate';
  END IF;

  -- org_id must be passed in user metadata
  BEGIN
    v_org_id := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'org_id', '')), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_org_id := NULL;
  END;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'No org_id in user metadata for user %, skipping trigger profile creation', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;

  INSERT INTO public.user_profiles (
    id, user_id, org_id,
    email, full_name, first_name, last_name, phone,
    pilot_license_type, aircraft_type, call_sign,
    how_often_fly_from_ytz, how_did_you_hear,
    role, membership_level, member_number, status,
    is_student_pilot, flight_school, instructor_name,
    invited_at
  )
  VALUES (
    uuid_generate_v4(), NEW.id, v_org_id,
    LOWER(TRIM(NEW.email)), v_full_name, v_first_name, v_last_name, v_phone,
    v_pilot_license_type, v_aircraft_type, v_call_sign,
    v_how_often_fly_from_ytz, v_how_did_you_hear,
    v_role, v_membership_level, NULL, 'pending',
    v_is_student_pilot, v_flight_school, v_instructor_name,
    CASE WHEN (NEW.raw_user_meta_data->>'invited_by_admin') = 'true'
           OR (NEW.raw_user_meta_data->>'invited_by_member') = 'true'
         THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, org_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------
-- 10. is_admin: keep existing signature + add org-aware version
-- --------------------------------------------------------

-- Existing is_admin checks across all orgs (backward compat for Stripe webhook etc.)
-- Keep original parameter name 'user_id' to match existing signature (avoids DROP CASCADE)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = is_admin.user_id AND up.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Org-scoped admin check (use in new code)
CREATE OR REPLACE FUNCTION public.is_org_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = p_user_id AND org_id = p_org_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- --------------------------------------------------------
-- 11. RLS: update user_profiles policies to use user_id
-- --------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- INSERT policy (needed now that trigger no longer auto-inserts for service-role calls)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- --------------------------------------------------------
-- 12. Default settings per org helper
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_default_org_settings(p_org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.settings (key, value, description, org_id) VALUES
    ('membership_fee_full',      '45',   'Annual fee for Full membership (CAD)',      p_org_id),
    ('membership_fee_student',   '25',   'Annual fee for Student membership (CAD)',   p_org_id),
    ('membership_fee_associate', '25',   'Annual fee for Associate membership (CAD)', p_org_id),
    ('membership_fee_corporate', '125',  'Annual fee for Corporate membership (CAD)',  p_org_id),
    ('membership_fee_honorary',  '0',    'Annual fee for Honorary membership (CAD)',  p_org_id),
    ('trial_type_full',          'sept1','Trial type for Full members',               p_org_id),
    ('trial_type_student',       'months','Trial type for Student members',           p_org_id),
    ('trial_months_student',     '12',   'Trial duration months for Student members', p_org_id),
    ('trial_type_associate',     'sept1','Trial type for Associate members',          p_org_id),
    ('trial_type_corporate',     'none', 'Trial type for Corporate members',          p_org_id),
    ('trial_type_honorary',      'none', 'Trial type for Honorary members',           p_org_id)
  ON CONFLICT (key, org_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill default settings for TIPA (migrating existing settings rows already have values;
-- this adds any missing keys)
SELECT public.create_default_org_settings('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- ============================================================
-- END: 20250322000000_add_multi_tenancy.sql
-- ============================================================

-- ============================================================
-- BEGIN: 20250323000001_add_stripe_connect.sql
-- ============================================================
-- Add Stripe Connect fields to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- END: 20250323000001_add_stripe_connect.sql
-- ============================================================

-- ============================================================
-- BEGIN: 20250323000002_add_org_config.sql
-- ============================================================

-- Org-level configuration settings: club identity, features, enabled levels, signup fields, email templates

-- Default signup fields config JSON (stored as a setting value)

-- Keys map to sections/fields on the become-a-member form
-- TIPA-specific fields (copa_membership, fly_frequency) default to disabled for new orgs

-- Update create_default_org_settings to include all new settings
CREATE OR REPLACE FUNCTION create_default_org_settings(p_org_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO settings (key, value, org_id) VALUES
    -- Membership fees (CAD)
    ('membership_fee_full',         '45',                     p_org_id),
    ('membership_fee_student',      '25',                     p_org_id),
    ('membership_fee_associate',    '25',                     p_org_id),
    ('membership_fee_corporate',    '125',                    p_org_id),
    ('membership_fee_honorary',     '0',                      p_org_id),
    -- Trial config
    ('trial_type_full',             'sept1',                  p_org_id),
    ('trial_type_student',          'months',                 p_org_id),
    ('trial_months_student',        '12',                     p_org_id),
    ('trial_type_associate',        'sept1',                  p_org_id),
    ('trial_type_corporate',        'none',                   p_org_id),
    ('trial_type_honorary',         'none',                   p_org_id),
    -- Club identity
    ('club_description',            '',                       p_org_id),
    ('contact_email',               '',                       p_org_id),
    ('website_url',                 '',                       p_org_id),
    ('accent_color',                '#0d1e26',                p_org_id),
    ('club_display_name',           '',                       p_org_id),
    ('timezone',                    'America/Toronto',        p_org_id),
    -- Features
    ('feature_discussions',         'true',                   p_org_id),
    ('feature_events',              'true',                   p_org_id),
    ('feature_resources',           'true',                   p_org_id),
    ('feature_member_directory',    'true',                   p_org_id),
    ('require_member_approval',     'true',                   p_org_id),
    ('allow_member_invitations',    'true',                   p_org_id),
    -- Enabled membership levels
    ('level_full_enabled',          'true',                   p_org_id),
    ('level_student_enabled',       'true',                   p_org_id),
    ('level_associate_enabled',     'true',                   p_org_id),
    ('level_corporate_enabled',     'true',                   p_org_id),
    ('level_honorary_enabled',      'true',                   p_org_id),
    -- Signup fields config (JSON array of {key, label, group, enabled, required})
    ('signup_fields_config',        '[{"key":"phone","label":"Phone","group":"contact","enabled":true,"required":false},{"key":"address","label":"Mailing Address","group":"address","enabled":true,"required":false},{"key":"membership_class","label":"Membership Class","group":"membership","enabled":true,"required":true},{"key":"aviation_info","label":"Aviation Information","group":"aviation","enabled":true,"required":false},{"key":"fly_frequency","label":"How Often Fly From YTZ","group":"aviation","enabled":false,"required":false},{"key":"student_pilot","label":"Student Pilot Info","group":"student","enabled":true,"required":false},{"key":"copa_membership","label":"COPA Membership","group":"copa","enabled":false,"required":false},{"key":"statement_of_interest","label":"Statement of Interest","group":"application","enabled":true,"required":false},{"key":"interests","label":"Interests","group":"application","enabled":true,"required":false},{"key":"how_did_you_hear","label":"How Did You Hear","group":"application","enabled":true,"required":false}]', p_org_id),
    -- Email templates
    ('welcome_email_subject',       'Welcome!',               p_org_id),
    ('welcome_email_body',          '',                       p_org_id)
  ON CONFLICT (key, org_id) DO NOTHING;
END;
$$;

-- Backfill new settings for all existing orgs (using DO NOTHING so existing values are preserved)
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    INSERT INTO settings (key, value, org_id) VALUES
      -- Club identity
      ('club_description',            '',                       org_record.id),
      ('contact_email',               '',                       org_record.id),
      ('website_url',                 '',                       org_record.id),
      ('accent_color',                '#0d1e26',                org_record.id),
      ('club_display_name',           '',                       org_record.id),
      ('timezone',                    'America/Toronto',        org_record.id),
      -- Features
      ('feature_discussions',         'true',                   org_record.id),
      ('feature_events',              'true',                   org_record.id),
      ('feature_resources',           'true',                   org_record.id),
      ('feature_member_directory',    'true',                   org_record.id),
      ('require_member_approval',     'true',                   org_record.id),
      ('allow_member_invitations',    'true',                   org_record.id),
      -- Enabled levels
      ('level_full_enabled',          'true',                   org_record.id),
      ('level_student_enabled',       'true',                   org_record.id),
      ('level_associate_enabled',     'true',                   org_record.id),
      ('level_corporate_enabled',     'true',                   org_record.id),
      ('level_honorary_enabled',      'true',                   org_record.id),
      -- Signup fields (TIPA gets copa + fly_frequency enabled)
      ('signup_fields_config',        '[{"key":"phone","label":"Phone","group":"contact","enabled":true,"required":false},{"key":"address","label":"Mailing Address","group":"address","enabled":true,"required":false},{"key":"membership_class","label":"Membership Class","group":"membership","enabled":true,"required":true},{"key":"aviation_info","label":"Aviation Information","group":"aviation","enabled":true,"required":false},{"key":"fly_frequency","label":"How Often Fly From YTZ","group":"aviation","enabled":true,"required":false},{"key":"student_pilot","label":"Student Pilot Info","group":"student","enabled":true,"required":false},{"key":"copa_membership","label":"COPA Membership","group":"copa","enabled":true,"required":true},{"key":"statement_of_interest","label":"Statement of Interest","group":"application","enabled":true,"required":false},{"key":"interests","label":"Interests","group":"application","enabled":true,"required":false},{"key":"how_did_you_hear","label":"How Did You Hear","group":"application","enabled":true,"required":false}]', org_record.id),
      -- Email templates
      ('welcome_email_subject',       'Welcome!',               org_record.id),
      ('welcome_email_body',          '',                       org_record.id)
    ON CONFLICT (key, org_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================
-- END: 20250323000002_add_org_config.sql
-- ============================================================

-- ============================================================
-- BEGIN: 20250323000003_configurable_membership_levels.sql
-- ============================================================
-- Make membership_level a free-text field so orgs can define their own levels.
-- The old CHECK constraint only allowed TIPA's 5 hardcoded values.

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_membership_level_check;

-- Add consolidated levels config to the default org settings function.
-- Each level: { key, label, fee, trialType, trialMonths?, enabled }
CREATE OR REPLACE FUNCTION create_default_org_settings(p_org_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO settings (key, value, org_id) VALUES
    -- Consolidated membership levels config (replaces individual fee/trial/enabled keys)
    ('membership_levels_config', '[
      {"key":"full",      "label":"Full Member", "fee":45,  "trialType":"sept1",  "enabled":true},
      {"key":"student",   "label":"Student",     "fee":25,  "trialType":"months", "trialMonths":12, "enabled":true},
      {"key":"associate", "label":"Associate",   "fee":25,  "trialType":"sept1",  "enabled":true},
      {"key":"corporate", "label":"Corporate",   "fee":125, "trialType":"none",    "enabled":true},
      {"key":"honorary",  "label":"Honorary",    "fee":0,   "trialType":"none",    "enabled":true}
    ]', p_org_id),
    -- Legacy per-level settings (kept for TIPA backward compat)
    ('membership_fee_full',         '45',      p_org_id),
    ('membership_fee_student',      '25',      p_org_id),
    ('membership_fee_associate',    '25',      p_org_id),
    ('membership_fee_corporate',    '125',     p_org_id),
    ('membership_fee_honorary',     '0',       p_org_id),
    ('trial_type_full',             'sept1',   p_org_id),
    ('trial_type_student',          'months',  p_org_id),
    ('trial_months_student',        '12',      p_org_id),
    ('trial_type_associate',        'sept1',   p_org_id),
    ('trial_type_corporate',        'none',    p_org_id),
    ('trial_type_honorary',         'none',    p_org_id),
    ('level_full_enabled',          'true',    p_org_id),
    ('level_student_enabled',       'true',    p_org_id),
    ('level_associate_enabled',     'true',    p_org_id),
    ('level_corporate_enabled',     'true',    p_org_id),
    ('level_honorary_enabled',      'true',    p_org_id),
    -- Club identity
    ('club_description',    '',                  p_org_id),
    ('contact_email',       '',                  p_org_id),
    ('website_url',         '',                  p_org_id),
    ('accent_color',        '#0d1e26',            p_org_id),
    ('club_display_name',   '',                  p_org_id),
    ('timezone',            'America/Toronto',    p_org_id),
    -- Features
    ('feature_discussions',        'true',  p_org_id),
    ('feature_events',             'true',  p_org_id),
    ('feature_resources',          'true',  p_org_id),
    ('feature_member_directory',   'true',  p_org_id),
    ('require_member_approval',    'true',  p_org_id),
    ('allow_member_invitations',   'true',  p_org_id),
    -- Signup fields config
    ('signup_fields_config', '[{"key":"phone","label":"Phone","group":"contact","enabled":true,"required":false},{"key":"address","label":"Mailing Address","group":"address","enabled":true,"required":false},{"key":"membership_class","label":"Membership Class","group":"membership","enabled":true,"required":true},{"key":"aviation_info","label":"Aviation Information","group":"aviation","enabled":true,"required":false},{"key":"fly_frequency","label":"How Often Fly From YTZ","group":"aviation","enabled":false,"required":false},{"key":"student_pilot","label":"Student Pilot Info","group":"student","enabled":true,"required":false},{"key":"copa_membership","label":"COPA Membership","group":"copa","enabled":false,"required":false},{"key":"statement_of_interest","label":"Statement of Interest","group":"application","enabled":true,"required":false},{"key":"interests","label":"Interests","group":"application","enabled":true,"required":false},{"key":"how_did_you_hear","label":"How Did You Hear","group":"application","enabled":true,"required":false}]', p_org_id),
    -- Email templates
    ('welcome_email_subject', 'Welcome!', p_org_id),
    ('welcome_email_body',    '',         p_org_id)
  ON CONFLICT (key, org_id) DO NOTHING;
END;
$$;

-- Backfill membership_levels_config for all existing orgs that don't have it yet
INSERT INTO settings (key, value, org_id)
SELECT
  'membership_levels_config',
  '[
    {"key":"full",      "label":"Full Member", "fee":45,  "trialType":"sept1",  "enabled":true},
    {"key":"student",   "label":"Student",     "fee":25,  "trialType":"months", "trialMonths":12, "enabled":true},
    {"key":"associate", "label":"Associate",   "fee":25,  "trialType":"sept1",  "enabled":true},
    {"key":"corporate", "label":"Corporate",   "fee":125, "trialType":"none",    "enabled":true},
    {"key":"honorary",  "label":"Honorary",    "fee":0,   "trialType":"none",    "enabled":true}
  ]',
  id
FROM organizations
ON CONFLICT (key, org_id) DO NOTHING;

-- ============================================================
-- END: 20250323000003_configurable_membership_levels.sql
-- ============================================================

-- ============================================================
-- BEGIN: 20250323000004_add_org_plan.sql
-- ============================================================
-- Add plan column to organizations
-- Plans: hobby ($5), starter ($49), community ($99), club_pro ($199)

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'hobby';

-- Grant existing orgs their appropriate plan.
-- TIPA is our flagship customer and gets Club Pro.
UPDATE public.organizations
  SET plan = 'club_pro'
  WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Any other orgs that were created before this migration
-- (besides TIPA) get community as a generous default.
UPDATE public.organizations
  SET plan = 'community'
  WHERE id != 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND plan = 'hobby';

-- ============================================================
-- END: 20250323000004_add_org_plan.sql
-- ============================================================

-- ============================================================
-- BEGIN: 20250323000005_add_custom_data_to_profiles.sql
-- ============================================================
-- Custom field values submitted during signup (admin-configurable fields)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}';

-- ============================================================
-- END: 20250323000005_add_custom_data_to_profiles.sql
-- ============================================================

-- ============================================================
-- BEGIN: 20250323000006_create_org_memberships.sql
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Extract org_memberships from user_profiles
--
-- DATA SAFETY: All existing member data is copied to org_memberships
-- BEFORE any columns are dropped from user_profiles.  The migration
-- is safe to run against lounge-dev / production — no TIPA member
-- records will be lost.
--
-- Deploy order: run this migration + deploy updated app code together.
-- The updated app reads from org_memberships / member_profiles view,
-- so the migration and code must land at the same time.
-- ============================================================

-- --------------------------------------------------------
-- 1. org_memberships table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_memberships (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id                          UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Access control
  role                            TEXT        NOT NULL DEFAULT 'member'    CHECK (role IN ('member', 'admin')),
  status                          TEXT        NOT NULL DEFAULT 'pending'   CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),

  -- Membership details
  membership_level                TEXT        NOT NULL DEFAULT 'Associate',
  membership_class                TEXT,
  member_number                   TEXT,
  membership_expires_at           TIMESTAMPTZ,

  -- Invitation / reminder tracking
  invited_at                      TIMESTAMPTZ,
  last_reminder_sent_at           TIMESTAMPTZ,
  reminder_count                  INTEGER     NOT NULL DEFAULT 0,

  -- Payments / subscriptions
  stripe_subscription_id          TEXT,
  stripe_customer_id              TEXT,
  paypal_subscription_id          TEXT,
  subscription_cancel_at_period_end BOOLEAN   NOT NULL DEFAULT FALSE,

  -- Application fields (captured at signup, org-specific)
  statement_of_interest           TEXT,
  interests                       TEXT,
  how_did_you_hear                TEXT,
  is_copa_member                  TEXT,
  join_copa_flight_32             TEXT,
  copa_membership_number          TEXT,

  -- Aviation / TIPA-specific profile fields
  -- These are kept as typed columns for now; orgs with different
  -- fields should use custom_data instead.
  pilot_license_type              TEXT,
  aircraft_type                   TEXT,
  call_sign                       TEXT,
  how_often_fly_from_ytz          TEXT,
  is_student_pilot                BOOLEAN     NOT NULL DEFAULT FALSE,
  flight_school                   TEXT,
  instructor_name                 TEXT,

  -- Arbitrary org-defined fields (admin-configurable signup fields)
  custom_data                     JSONB,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, org_id)
);

-- --------------------------------------------------------
-- 2. Indexes
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON public.org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id  ON public.org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_status  ON public.org_memberships(org_id, status);

-- --------------------------------------------------------
-- 3. updated_at trigger
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS update_org_memberships_updated_at ON public.org_memberships;
CREATE TRIGGER update_org_memberships_updated_at
  BEFORE UPDATE ON public.org_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------
-- 4. Copy ALL existing data from user_profiles → org_memberships
--    Data is fully preserved before any columns are dropped.
--    This is safe for existing TIPA members and any other orgs.
--    Skipped if columns were already migrated by a prior run.
-- --------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    INSERT INTO public.org_memberships (
      id, user_id, org_id,
      role, status, membership_level, membership_class, member_number, membership_expires_at,
      invited_at, last_reminder_sent_at, reminder_count,
      stripe_subscription_id, stripe_customer_id, paypal_subscription_id, subscription_cancel_at_period_end,
      statement_of_interest, interests, how_did_you_hear,
      is_copa_member, join_copa_flight_32, copa_membership_number,
      pilot_license_type, aircraft_type, call_sign, how_often_fly_from_ytz,
      is_student_pilot, flight_school, instructor_name,
      custom_data, created_at, updated_at
    )
    SELECT
      id,
      user_id,
      COALESCE(org_id, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid) as org_id,
      role, status, membership_level, membership_class, member_number, membership_expires_at,
      invited_at, last_reminder_sent_at, COALESCE(reminder_count, 0),
      stripe_subscription_id, stripe_customer_id, paypal_subscription_id, COALESCE(subscription_cancel_at_period_end, FALSE),
      statement_of_interest, interests, how_did_you_hear,
      is_copa_member, join_copa_flight_32, copa_membership_number,
      pilot_license_type, aircraft_type, call_sign, how_often_fly_from_ytz,
      COALESCE(is_student_pilot, FALSE), flight_school, instructor_name,
      custom_data, created_at, updated_at
    FROM public.user_profiles
    ON CONFLICT (user_id, org_id) DO NOTHING;
  END IF;
END $$;

-- --------------------------------------------------------
-- 5. Drop org_id / membership columns from user_profiles
--    (user_profiles now holds global identity only)
-- --------------------------------------------------------

-- Drop policies that reference org_id or role on user_profiles before dropping the columns
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_org_unique,
  DROP COLUMN IF EXISTS org_id,
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS membership_level,
  DROP COLUMN IF EXISTS membership_class,
  DROP COLUMN IF EXISTS member_number,
  DROP COLUMN IF EXISTS membership_expires_at,
  DROP COLUMN IF EXISTS invited_at,
  DROP COLUMN IF EXISTS last_reminder_sent_at,
  DROP COLUMN IF EXISTS reminder_count,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS paypal_subscription_id,
  DROP COLUMN IF EXISTS subscription_cancel_at_period_end,
  DROP COLUMN IF EXISTS statement_of_interest,
  DROP COLUMN IF EXISTS interests,
  DROP COLUMN IF EXISTS how_did_you_hear,
  DROP COLUMN IF EXISTS is_copa_member,
  DROP COLUMN IF EXISTS join_copa_flight_32,
  DROP COLUMN IF EXISTS copa_membership_number,
  DROP COLUMN IF EXISTS pilot_license_type,
  DROP COLUMN IF EXISTS aircraft_type,
  DROP COLUMN IF EXISTS call_sign,
  DROP COLUMN IF EXISTS how_often_fly_from_ytz,
  DROP COLUMN IF EXISTS is_student_pilot,
  DROP COLUMN IF EXISTS flight_school,
  DROP COLUMN IF EXISTS instructor_name,
  DROP COLUMN IF EXISTS custom_data;

-- user_profiles now has one row per user (no org scoping)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_id_unique;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- Recreate user_profiles RLS policies without org_id/role references
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.org_memberships WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- --------------------------------------------------------
-- 6. Convenience view: joined identity + membership
-- --------------------------------------------------------
CREATE OR REPLACE VIEW public.member_profiles AS
SELECT
  -- membership fields (id = org_memberships.id)
  om.id,
  om.user_id,
  om.org_id,
  om.role,
  om.status,
  om.membership_level,
  om.membership_class,
  om.member_number,
  om.membership_expires_at,
  om.invited_at,
  om.last_reminder_sent_at,
  om.reminder_count,
  om.stripe_subscription_id,
  om.stripe_customer_id,
  om.paypal_subscription_id,
  om.subscription_cancel_at_period_end,
  om.statement_of_interest,
  om.interests,
  om.how_did_you_hear,
  om.is_copa_member,
  om.join_copa_flight_32,
  om.copa_membership_number,
  om.pilot_license_type,
  om.aircraft_type,
  om.call_sign,
  om.how_often_fly_from_ytz,
  om.is_student_pilot,
  om.flight_school,
  om.instructor_name,
  om.custom_data,
  om.created_at,
  om.updated_at,
  -- identity fields
  up.email,
  up.full_name,
  up.first_name,
  up.last_name,
  up.phone,
  up.street,
  up.city,
  up.province_state,
  up.postal_zip_code,
  up.country,
  up.profile_picture_url,
  up.notify_replies
FROM public.org_memberships om
JOIN public.user_profiles up ON up.user_id = om.user_id;

-- --------------------------------------------------------
-- 7. RLS on org_memberships
-- --------------------------------------------------------
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

-- Members can read memberships in their own org
DROP POLICY IF EXISTS "Members can view org memberships" ON public.org_memberships;
CREATE POLICY "Members can view org memberships"
  ON public.org_memberships FOR SELECT
  USING (
    public.is_org_admin(auth.uid(), org_id)
    OR auth.uid() = user_id
  );

-- Users can update their own membership (non-privileged fields only —
-- role/status/membership_level are protected by the admin policy)
DROP POLICY IF EXISTS "Users can update own membership" ON public.org_memberships;
CREATE POLICY "Users can update own membership"
  ON public.org_memberships FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM public.org_memberships WHERE user_id = auth.uid() AND org_id = org_memberships.org_id)
    AND status = (SELECT status FROM public.org_memberships WHERE user_id = auth.uid() AND org_id = org_memberships.org_id)
    AND membership_level = (SELECT membership_level FROM public.org_memberships WHERE user_id = auth.uid() AND org_id = org_memberships.org_id)
  );

DROP POLICY IF EXISTS "Admins can update all memberships" ON public.org_memberships;
CREATE POLICY "Admins can update all memberships"
  ON public.org_memberships FOR UPDATE
  USING (public.is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS "Service role can insert memberships" ON public.org_memberships;
CREATE POLICY "Service role can insert memberships"
  ON public.org_memberships FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- --------------------------------------------------------
-- 8. Update helper functions to use org_memberships
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.user_id = is_admin.user_id AND om.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE user_id = p_user_id AND org_id = p_org_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.generate_member_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(member_number AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.org_memberships
  WHERE org_id = p_org_id
    AND member_number IS NOT NULL
    AND member_number ~ '^[0-9]+$'
    AND LENGTH(member_number) <= 6;
  RETURN LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- 9. Update assign_member_number trigger to use org_memberships
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS assign_member_number_trigger ON public.user_profiles;
DROP TRIGGER IF EXISTS assign_member_number_trigger ON public.org_memberships;

CREATE OR REPLACE FUNCTION public.assign_member_number_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (NEW.member_number IS NULL OR NEW.member_number = '')
     AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    NEW.member_number := public.generate_member_number(NEW.org_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER assign_member_number_trigger
  BEFORE UPDATE ON public.org_memberships
  FOR EACH ROW EXECUTE FUNCTION public.assign_member_number_on_approval();

-- --------------------------------------------------------
-- 10. Update handle_new_user trigger: insert into both tables
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name              TEXT;
  v_first_name             TEXT;
  v_last_name              TEXT;
  v_phone                  TEXT;
  v_pilot_license_type     TEXT;
  v_aircraft_type          TEXT;
  v_call_sign              TEXT;
  v_how_often_fly_from_ytz TEXT;
  v_how_did_you_hear       TEXT;
  v_role                   TEXT;
  v_membership_level       TEXT;
  v_is_student_pilot       BOOLEAN;
  v_flight_school          TEXT;
  v_instructor_name        TEXT;
  v_org_id                 UUID;
BEGIN
  v_full_name              := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  v_first_name             := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  v_last_name              := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  v_phone                  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_pilot_license_type     := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'pilot_license_type', '')), '');
  v_aircraft_type          := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'aircraft_type', '')), '');
  v_call_sign              := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'call_sign', '')), '');
  v_how_often_fly_from_ytz := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'how_often_fly_from_ytz', '')), '');
  v_how_did_you_hear       := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'how_did_you_hear', '')), '');
  v_is_student_pilot       := COALESCE((NEW.raw_user_meta_data->>'is_student_pilot')::BOOLEAN, false);
  v_flight_school          := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'flight_school', '')), '');
  v_instructor_name        := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'instructor_name', '')), '');

  v_role := COALESCE(NULLIF(LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', ''))), ''), 'member');
  IF v_role NOT IN ('member', 'admin') THEN v_role := 'member'; END IF;

  v_membership_level := COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'membership_level', '')), ''), 'Associate');

  BEGIN
    v_org_id := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'org_id', '')), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_org_id := NULL;
  END;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'No org_id in user metadata for user %, skipping profile creation', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;

  -- Upsert global identity profile
  INSERT INTO public.user_profiles (
    id, user_id,
    email, full_name, first_name, last_name, phone
  )
  VALUES (
    gen_random_uuid(), NEW.id,
    LOWER(TRIM(NEW.email)), v_full_name, v_first_name, v_last_name, v_phone
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name  = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    phone      = COALESCE(EXCLUDED.phone, user_profiles.phone);

  -- Insert org membership
  INSERT INTO public.org_memberships (
    user_id, org_id,
    pilot_license_type, aircraft_type, call_sign,
    how_often_fly_from_ytz, how_did_you_hear,
    role, membership_level, status,
    is_student_pilot, flight_school, instructor_name,
    invited_at
  )
  VALUES (
    NEW.id, v_org_id,
    v_pilot_license_type, v_aircraft_type, v_call_sign,
    v_how_often_fly_from_ytz, v_how_did_you_hear,
    v_role, v_membership_level, 'pending',
    v_is_student_pilot, v_flight_school, v_instructor_name,
    CASE WHEN (NEW.raw_user_meta_data->>'invited_by_admin') = 'true'
           OR (NEW.raw_user_meta_data->>'invited_by_member') = 'true'
         THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, org_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- END: 20250323000006_create_org_memberships.sql
-- ============================================================

-- ============================================================
-- BEGIN: 20260323000000_add_tipa_org_id_defaults.sql
-- ============================================================
-- Backward compatibility defaults
-- ============================================================
-- Some older code paths (and dev tooling) may insert into tenant
-- tables without explicitly setting `org_id`. After multi-tenancy
-- changes, `org_id` is NOT NULL, so those legacy inserts would fail.
--
-- To preserve backward compatibility, default `org_id` to the founding
-- TIPA organization whenever the column is omitted.
--
-- NOTE: This default is intentionally scoped to "legacy inserts".
-- New/multi-tenant aware code should always provide `org_id`.
-- ============================================================

DO $$
DECLARE
  tipa_org_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
  -- Core tenant-scoped tables
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.resources ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.resources SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.events ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.events SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'event_rsvps' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.event_rsvps ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.event_rsvps SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'threads' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.threads ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.threads SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.comments ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.comments SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reactions' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.reactions ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.reactions SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.notifications ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.notifications SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.payments SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.settings ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.settings SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;

  -- Membership table (created after multi-tenancy)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_memberships' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.org_memberships ALTER COLUMN org_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    UPDATE public.org_memberships SET org_id = tipa_org_id WHERE org_id IS NULL;
  END IF;
END $$;

-- ============================================================
-- END: 20260323000000_add_tipa_org_id_defaults.sql
-- ============================================================


-- Add Stripe billing fields for org plan tiers
-- Used for storing the platform-owned Stripe customer/subscription for an org.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;


-- Grant PostgREST-required permissions on tables created via migration.
-- Tables created through migrations (not the Supabase dashboard) don't get
-- default role grants, causing PGRST205 "table not found in schema cache".

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations      TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_memberships    TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings           TO anon, authenticated, service_role;

-- Sequences (needed for INSERT on tables with serial/uuid defaults)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Set TIPA-specific nav label for discussions section
insert into settings (org_id, key, value, updated_at)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'discussions_label',
  'Hangar Talk',
  now()
)
on conflict (key, org_id) do update set value = excluded.value, updated_at = now();

-- Add 14-day free trial support to organizations
alter table organizations
  add column if not exists trial_ends_at timestamptz;

-- Optional per-org favicon (browser tab). Falls back to logo_url when unset.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Public bucket for org logos and favicons (URLs stored on organizations.logo_url / favicon_url)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('org-branding', 'org-branding', true, 5242880)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Public read org branding" ON storage.objects;
CREATE POLICY "Public read org branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-branding');

-- Live flags from Stripe Connect Account (synced on return, integrations refresh, account.updated webhook)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Best-effort backfill: previously we only stored onboarding_complete when charges_enabled was true
UPDATE public.organizations
SET stripe_charges_enabled = stripe_onboarding_complete
WHERE stripe_charges_enabled IS NOT TRUE AND stripe_onboarding_complete IS TRUE;
