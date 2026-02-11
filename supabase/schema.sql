-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  pilot_license_type TEXT,
  aircraft_type TEXT,
  call_sign TEXT,
  how_often_fly_from_ytz TEXT,
  how_did_you_hear TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  membership_level TEXT NOT NULL DEFAULT 'Full' CHECK (membership_level IN ('Full', 'Student', 'Associate', 'Corporate', 'Honorary')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  membership_expires_at TIMESTAMPTZ,
  paypal_subscription_id TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  profile_picture_url TEXT,
  member_number TEXT UNIQUE,
  is_student_pilot BOOLEAN NOT NULL DEFAULT false,
  flight_school TEXT,
  instructor_name TEXT,
  interests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  content TEXT,
  resource_type TEXT NOT NULL DEFAULT 'link' CHECK (resource_type IN ('link', 'document', 'video', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create settings table for app configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create threads table for discussions board
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('aircraft_shares', 'instructor_availability', 'gear_for_sale', 'flying_at_ytz', 'general_aviation', 'training_safety_proficiency', 'wanted', 'other')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_email TEXT, -- Store email for deleted users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comments table for discussion board
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_email TEXT, -- Store email for deleted users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reactions table for threads and comments
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, comment_id, user_id, reaction_type)
);

-- Create payments table for payment tracking and audit trail
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'paypal', 'cash', 'wire')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  membership_expires_at TIMESTAMPTZ NOT NULL,
  -- Payment method specific IDs
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  paypal_subscription_id TEXT,
  paypal_transaction_id TEXT,
  -- Manual payment details
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_subscription_id ON payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_subscription_id ON payments(paypal_subscription_id);

-- Insert default membership fee setting
INSERT INTO settings (key, value, description)
VALUES ('annual_membership_fee', '99', 'Annual membership fee in USD')
ON CONFLICT (key) DO NOTHING;

-- Create function to generate next member number
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get the highest existing member number, or start from 0 (will become 1)
  SELECT COALESCE(MAX(CAST(member_number AS INTEGER)), 0) + 1
  INTO next_number
  FROM user_profiles
  WHERE member_number IS NOT NULL 
    AND member_number ~ '^[0-9]+$'  -- Only consider numeric member numbers
    AND LENGTH(member_number) <= 6; -- Only consider 6-digit or less numbers
  
  -- Format as 6-digit string with leading zeros (starts from 000001)
  formatted_number := LPAD(next_number::TEXT, 6, '0');
  
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically create user profile on signup
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
BEGIN
  -- Helper function to convert empty strings to NULL
  -- NULLIF converts empty string to NULL, then COALESCE handles NULL
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
  -- Ensure it's one of the valid values
  IF v_role NOT IN ('member', 'admin') THEN
    v_role := 'member';
  END IF;
  
  v_membership_level := COALESCE(
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'membership_level', '')), ''),
    'Associate'
  );
  -- Ensure it's one of the valid values
  IF v_membership_level NOT IN ('Full', 'Student', 'Associate', 'Corporate', 'Honorary') THEN
    v_membership_level := 'Associate';
  END IF;

  -- Generate unique member number
  v_member_number := public.generate_member_number();

  -- Ensure email is not null (should never happen, but safety check)
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;

  -- Insert user profile with error handling
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
    -- Log the error but don't fail the user creation
    -- This allows the user to be created even if profile creation fails
    -- We'll catch this error in the application and create the profile manually
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    -- Return NEW to allow user creation to proceed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_threads_updated_at ON threads;
CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view resources" ON resources;
DROP POLICY IF EXISTS "Admins can insert resources" ON resources;
DROP POLICY IF EXISTS "Admins can update resources" ON resources;
DROP POLICY IF EXISTS "Admins can delete resources" ON resources;
DROP POLICY IF EXISTS "Authenticated users can view events" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;
DROP POLICY IF EXISTS "All users can view settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can view threads" ON threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON threads;
DROP POLICY IF EXISTS "Users can update own threads" ON threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON threads;
DROP POLICY IF EXISTS "Admins can delete threads" ON threads;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Admins can delete comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON reactions;
DROP POLICY IF EXISTS "Authenticated users can create reactions" ON reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON reactions;
DROP POLICY IF EXISTS "Admins can delete reactions" ON reactions;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Service role can insert payments" ON payments;

-- User profiles policies
-- All authenticated users can view all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON user_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Resources policies
-- All authenticated users can view resources
CREATE POLICY "Authenticated users can view resources"
  ON resources FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert resources
CREATE POLICY "Admins can insert resources"
  ON resources FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update resources
CREATE POLICY "Admins can update resources"
  ON resources FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Only admins can delete resources
CREATE POLICY "Admins can delete resources"
  ON resources FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Events policies
-- All authenticated users can view events
CREATE POLICY "Authenticated users can view events"
  ON events FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert events
CREATE POLICY "Admins can insert events"
  ON events FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update events
CREATE POLICY "Admins can update events"
  ON events FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Only admins can delete events
CREATE POLICY "Admins can delete events"
  ON events FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Settings policies
-- All authenticated users can view settings
CREATE POLICY "All users can view settings"
  ON settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Threads policies
-- All authenticated users can view threads
CREATE POLICY "Authenticated users can view threads"
  ON threads FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can create threads
CREATE POLICY "Authenticated users can create threads"
  ON threads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Users can update their own threads
CREATE POLICY "Users can update own threads"
  ON threads FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users can delete their own threads
CREATE POLICY "Users can delete own threads"
  ON threads FOR DELETE
  USING (auth.uid() = created_by);

-- Admins can delete any thread
CREATE POLICY "Admins can delete threads"
  ON threads FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Comments policies
-- All authenticated users can view comments
CREATE POLICY "Authenticated users can view comments"
  ON comments FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = created_by);

-- Admins can delete any comment
CREATE POLICY "Admins can delete comments"
  ON comments FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Reactions policies
-- All authenticated users can view reactions
CREATE POLICY "Authenticated users can view reactions"
  ON reactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can create reactions
CREATE POLICY "Authenticated users can create reactions"
  ON reactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can delete any reaction
CREATE POLICY "Admins can delete reactions"
  ON reactions FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Payments policies
-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can insert payments (for manual payment recording)
CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Service role can insert payments (for webhooks and system operations)
CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Storage Bucket Setup for Profile Pictures

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true, -- Public bucket so images can be accessed via URL
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for profile-pictures bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;

-- Policy: Users can upload files to their own folder in profile-pictures bucket
-- Files are stored as: profile-pictures/{user_id}/{timestamp}.{ext}
CREATE POLICY "Users can upload their own profile pictures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Public can view profile pictures (since bucket is public)
CREATE POLICY "Public can view profile pictures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Storage Bucket Setup for Thread Images
-- Note: The threads bucket should be created as a private bucket
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'threads',
--   'threads',
--   false, -- Private bucket
--   10485760, -- 10MB limit per file
--   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
-- )
-- ON CONFLICT (id) DO NOTHING;

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

-- Storage Bucket Setup for Resources and Events Images
-- Note: The resources and events buckets should be created as private buckets in Supabase Dashboard
-- This schema only sets up the RLS policies

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
