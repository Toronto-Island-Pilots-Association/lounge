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
UPDATE public.user_profiles
SET
  user_id = id,
  org_id  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE user_id IS NULL;

-- Drop the FK that tied user_profiles.id to auth.users.id
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- id is now a standalone surrogate UUID (keeps existing values for TIPA)
-- Add user_id FK to auth.users
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

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
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = p_user_id AND role = 'admin'
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
  WITH CHECK (
    auth.uid() = user_id
    AND role = (
      SELECT role FROM public.user_profiles
      WHERE user_id = auth.uid() AND org_id = user_profiles.org_id
    )
  );

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
-- Creates default membership fee and trial settings for a new org.
-- Call this after inserting a new organization row.
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_default_org_settings(p_org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.settings (key, value, description, org_id) VALUES
    ('membership_fee_full',      '45',   'Annual fee for Full membership (CAD)',      p_org_id),
    ('membership_fee_student',   '25',   'Annual fee for Student membership (CAD)',   p_org_id),
    ('membership_fee_associate', '25',   'Annual fee for Associate membership (CAD)', p_org_id),
    ('membership_fee_corporate', '125',  'Annual fee for Corporate membership (CAD)', p_org_id),
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
