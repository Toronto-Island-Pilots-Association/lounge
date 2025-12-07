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
  membership_level TEXT NOT NULL DEFAULT 'free' CHECK (membership_level IN ('free', 'paid')),
  membership_expires_at TIMESTAMPTZ,
  paypal_subscription_id TEXT,
  profile_picture_url TEXT,
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

-- Insert default membership fee setting
INSERT INTO settings (key, value, description)
VALUES ('annual_membership_fee', '99', 'Annual membership fee in USD')
ON CONFLICT (key) DO NOTHING;

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    membership_level
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'pilot_license_type', NULL),
    COALESCE(NEW.raw_user_meta_data->>'aircraft_type', NULL),
    COALESCE(NEW.raw_user_meta_data->>'call_sign', NULL),
    COALESCE(NEW.raw_user_meta_data->>'how_often_fly_from_ytz', NULL),
    COALESCE(NEW.raw_user_meta_data->>'how_did_you_hear', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')::TEXT,
    COALESCE(NEW.raw_user_meta_data->>'membership_level', 'free')::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

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
