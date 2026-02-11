-- ============================================================================
-- Migration: Add Interests Field to User Profiles
-- ============================================================================
-- Adds an interests field to track member interests during application
-- ============================================================================

-- Add interests column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS interests TEXT;

-- Add comment
COMMENT ON COLUMN user_profiles.interests IS 'Member interests selected during application';
