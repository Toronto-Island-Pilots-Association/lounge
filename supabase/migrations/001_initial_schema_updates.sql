-- Consolidated Migration: Initial Schema Updates
-- This migration consolidates all schema updates including:
-- 1. Membership level updates (4 tiers)
-- 2. Member number field and functions
-- 3. Discussion categories
-- 4. Member number assignment on approval
-- 5. Image URLs support for threads, resources, and events
-- 6. Storage bucket setup for threads, resources, and events
-- 7. Resource categories (tipa_newsletters, airport_updates, reminder, other)
-- 8. User status: add 'expired' (membership lapsed due to non-payment)
--
-- This migration is idempotent (safe to run multiple times)

-- ============================================================================
-- PART 1: Update Membership Levels (5 tiers)
-- ============================================================================
-- Changes to: 'Full', 'Student', 'Associate', 'Corporate', 'Honorary'

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_membership_level_check;

-- Step 2: Set any invalid/old values to default (only new tiers are valid)
UPDATE user_profiles
SET membership_level = 'Full'
WHERE membership_level IS NULL
   OR membership_level NOT IN ('Full', 'Student', 'Associate', 'Corporate', 'Honorary');

-- Step 3: Add new CHECK constraint with 5 values
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_membership_level_check
CHECK (membership_level IN ('Full', 'Student', 'Associate', 'Corporate', 'Honorary'));

-- Step 4: Update default value
ALTER TABLE user_profiles
ALTER COLUMN membership_level SET DEFAULT 'Full';

-- ============================================================================
-- PART 2: Add Member Number Field and Generation Function
-- ============================================================================

-- Step 1: Add member_number column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS member_number TEXT UNIQUE;

-- Step 2: Create function to generate next member number
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get the highest existing member number, or start from 0
  SELECT COALESCE(MAX(CAST(member_number AS INTEGER)), -1) + 1
  INTO next_number
  FROM user_profiles
  WHERE member_number IS NOT NULL 
    AND member_number ~ '^[0-9]+$'  -- Only consider numeric member numbers
    AND LENGTH(member_number) <= 6; -- Only consider 6-digit or less numbers
  
  -- Format as 6-digit string with leading zeros
  formatted_number := LPAD(next_number::TEXT, 6, '0');
  
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: Add Discussion Categories to Threads
-- ============================================================================

-- Step 1: Add the category column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'threads' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.threads 
    ADD COLUMN category TEXT NOT NULL DEFAULT 'other';
  END IF;
END $$;

-- Step 2: Update the check constraint to include all categories
ALTER TABLE public.threads 
DROP CONSTRAINT IF EXISTS threads_category_check;

ALTER TABLE public.threads 
ADD CONSTRAINT threads_category_check 
CHECK (category IN (
  'aircraft_shares', 
  'instructor_availability', 
  'gear_for_sale', 
  'lounge_feedback', 
  'other'
));

-- Step 3: Add/update column comment
COMMENT ON COLUMN public.threads.category IS 'Category for discussions: aircraft_shares (Aircraft Shares / Block Time), instructor_availability (Instructor Availability), gear_for_sale (Gear for Sale), lounge_feedback (Lounge Feedback), or other (Other)';

-- ============================================================================
-- PART 4: Update handle_new_user Function (No Member Number on Creation)
-- ============================================================================

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
BEGIN
  -- Extract metadata with null handling
  v_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  v_first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  v_last_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_pilot_license_type := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'pilot_license_type', '')), '');
  v_aircraft_type := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'aircraft_type', '')), '');
  v_call_sign := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'call_sign', '')), '');
  v_how_often_fly_from_ytz := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'how_often_fly_from_ytz', '')), '');
  v_how_did_you_hear := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'how_did_you_hear', '')), '');
  
  -- Ensure role and membership_level match the CHECK constraints exactly
  v_role := COALESCE(
    NULLIF(LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', ''))), ''),
    'member'
  );
  IF v_role NOT IN ('member', 'admin') THEN
    v_role := 'member';
  END IF;
  
  v_membership_level := COALESCE(
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'membership_level', '')), ''),
    'Full'
  );
  IF v_membership_level NOT IN ('Full', 'Student', 'Associate', 'Corporate', 'Honorary') THEN
    v_membership_level := 'Full';
  END IF;

  -- Do NOT assign member number here - it will be assigned when status changes to 'approved'
  -- member_number will be NULL initially

  -- Ensure email is not null
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;

  -- Insert user profile
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
    member_number,  -- Will be NULL initially
    status
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
    NULL,  -- Member number will be assigned on approval
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: Create Trigger for Member Number Assignment on Approval
-- ============================================================================

-- Create function to assign member number when status changes to approved
CREATE OR REPLACE FUNCTION public.assign_member_number_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign member number if:
  -- 1. Status is being changed to 'approved'
  -- 2. Member number is currently NULL
  -- 3. Previous status was not 'approved' (to avoid reassigning on re-approval)
  IF NEW.status = 'approved' 
     AND (NEW.member_number IS NULL OR NEW.member_number = '')
     AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Generate and assign member number
    NEW.member_number := public.generate_member_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that assigns member number when status changes to approved
DROP TRIGGER IF EXISTS assign_member_number_on_approval_trigger ON public.user_profiles;
CREATE TRIGGER assign_member_number_on_approval_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_member_number_on_approval();

-- ============================================================================
-- PART 6: Backfill Data for Existing Records
-- ============================================================================

-- Assign member numbers to existing approved members who don't have one
-- This handles any existing approved members that were created before this migration
DO $$
DECLARE
  profile_record RECORD;
  new_member_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the highest existing member number to continue from there
  SELECT COALESCE(MAX(CAST(member_number AS INTEGER)), 0)
  INTO counter
  FROM user_profiles
  WHERE member_number IS NOT NULL 
    AND member_number ~ '^[0-9]+$'
    AND LENGTH(member_number) <= 6;
  
  -- Start from next number
  counter := counter + 1;
  
  -- Loop through approved members without member numbers, ordered by creation date
  FOR profile_record IN 
    SELECT id FROM user_profiles 
    WHERE status = 'approved'
      AND (member_number IS NULL OR member_number = '')
    ORDER BY created_at ASC
  LOOP
    -- Generate member number (000001, 000002, 000003, etc.)
    new_member_number := LPAD(counter::TEXT, 6, '0');
    
    -- Update the profile with the member number
    UPDATE user_profiles
    SET member_number = new_member_number
    WHERE id = profile_record.id;
    
    counter := counter + 1;
  END LOOP;
END $$;

-- ============================================================================
-- PART 7: Add Image URLs Support to Threads
-- ============================================================================

-- Add image_urls column to threads table (array of text URLs)
ALTER TABLE public.threads 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Add comment for the column
COMMENT ON COLUMN public.threads.image_urls IS 'Array of image URLs uploaded with the discussion post';

-- ============================================================================
-- PART 8: Storage Bucket Setup for Thread Images
-- ============================================================================

-- Note: The threads bucket should be created as a private bucket in Supabase Dashboard
-- This migration only sets up the RLS policies
-- Note: RLS is already enabled on storage.objects by default in Supabase

-- Storage RLS Policies for threads bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload thread images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own thread images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view thread images" ON storage.objects;

-- Policy: Authenticated users can upload images to their own folder in threads bucket
-- Files are stored as: threads/{user_id}/{timestamp}-{random}.{ext}
CREATE POLICY "Users can upload thread images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'threads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own thread images
CREATE POLICY "Users can delete their own thread images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'threads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Authenticated users can view thread images (for private bucket with RLS)
CREATE POLICY "Authenticated users can view thread images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'threads'
  );

-- ============================================================================
-- PART 9: Add Image URL Support to Resources and Events
-- ============================================================================

-- Add image_url column to resources table
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.resources.image_url IS 'URL of the image uploaded for the resource';

-- Add file_url column to resources table for file attachments
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.resources.file_url IS 'URL of the file attachment for the resource (any file type)';

-- Add file_name column to resources table for file attachments
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.resources.file_name IS 'Original filename of the file attachment';

-- Add image_url column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.events.image_url IS 'URL of the image uploaded for the event';

-- ============================================================================
-- PART 10: Add Category Support to Resources
-- ============================================================================

-- Add category column to resources table with final categories
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

-- Drop any existing check constraint if it exists
ALTER TABLE public.resources 
DROP CONSTRAINT IF EXISTS resources_category_check;

-- Update existing data - map old categories to new ones or set to 'other'
UPDATE public.resources 
SET category = CASE
  WHEN category = 'tipa' THEN 'tipa_newsletters'
  WHEN category = 'cytz' THEN 'airport_updates'
  WHEN category = 'general_aviation' THEN 'other'
  WHEN category = 'aviation_news' THEN 'other'
  WHEN category IN ('tipa_newsletters', 'airport_updates', 'reminder', 'other') THEN category
  ELSE 'other'
END
WHERE category IS NOT NULL;

-- Add the check constraint with final categories: tipa_newsletters, airport_updates, reminder, other
ALTER TABLE public.resources 
ADD CONSTRAINT resources_category_check 
CHECK (category IN ('tipa_newsletters', 'airport_updates', 'reminder', 'other'));

-- Add comment for the column
COMMENT ON COLUMN public.resources.category IS 'Category classification for the resource: tipa_newsletters (TIPA Newsletters), airport_updates (Airport Updates), reminder (Reminder), or other (Other)';

-- Create index for better query performance when filtering by category
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);

-- ============================================================================
-- PART 11: Storage Bucket Setup for Resources and Events Images
-- ============================================================================

-- Note: The resources and events buckets should be created as private buckets in Supabase Dashboard
-- This migration only sets up the RLS policies

-- Storage RLS Policies for resources bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload resource images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete resource images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view resource images" ON storage.objects;

-- Policy: Admins can upload images to resources bucket
CREATE POLICY "Admins can upload resource images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resources' AND
    public.is_admin(auth.uid())
  );

-- Policy: Admins can delete resource images
CREATE POLICY "Admins can delete resource images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resources' AND
    public.is_admin(auth.uid())
  );

-- Policy: Authenticated users can view resource images
CREATE POLICY "Authenticated users can view resource images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resources'
  );

-- Storage RLS Policies for events bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view event images" ON storage.objects;

-- Policy: Admins can upload images to events bucket
CREATE POLICY "Admins can upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'events' AND
    public.is_admin(auth.uid())
  );

-- Policy: Admins can delete event images
CREATE POLICY "Admins can delete event images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'events' AND
    public.is_admin(auth.uid())
  );

-- Policy: Authenticated users can view event images
CREATE POLICY "Authenticated users can view event images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'events'
  );

-- ============================================================================
-- PART 12: Add 'expired' to user_profiles status
-- ============================================================================
-- Allows membership that has lapsed (unpaid) to be marked as expired.
-- Idempotent (safe to run multiple times).

ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_status_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));

-- ============================================================================
-- PART 13: Add student pilot fields to user_profiles
-- ============================================================================
-- Flag student pilots and collect flight school / instructor info at join.
-- Idempotent (safe to run multiple times).

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_student_pilot BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS flight_school TEXT;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS instructor_name TEXT;

-- Update handle_new_user to read and insert student pilot fields
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
  v_is_student_pilot := COALESCE((NEW.raw_user_meta_data->>'is_student_pilot')::boolean, false);
  v_flight_school := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'flight_school', '')), '');
  v_instructor_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'instructor_name', '')), '');

  v_role := COALESCE(
    NULLIF(LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', ''))), ''),
    'member'
  );
  IF v_role NOT IN ('member', 'admin') THEN
    v_role := 'member';
  END IF;

  v_membership_level := COALESCE(
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'membership_level', '')), ''),
    'Full'
  );
  IF v_membership_level NOT IN ('Full', 'Student', 'Associate', 'Corporate', 'Honorary') THEN
    v_membership_level := 'Full';
  END IF;

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
    instructor_name
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
    v_instructor_name
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
