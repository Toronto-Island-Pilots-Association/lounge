-- Migration: Add category field to threads table for classifieds
-- This migration adds a category field to the threads table and sets up all category options
-- Run this in your Supabase SQL Editor
-- This migration is idempotent (safe to run multiple times)

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
-- Drop existing constraint if it exists
ALTER TABLE public.threads 
DROP CONSTRAINT IF EXISTS threads_category_check;

-- Add updated constraint with all categories
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
COMMENT ON COLUMN public.threads.category IS 'Category for classifieds: aircraft_shares (Aircraft Shares / Block Time), instructor_availability (Instructor Availability), gear_for_sale (Gear for Sale), lounge_feedback (Lounge Feedback), or other (Other)';
