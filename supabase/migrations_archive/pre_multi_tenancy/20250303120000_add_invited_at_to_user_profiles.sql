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
