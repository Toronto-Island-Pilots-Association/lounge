-- Migration: Update threads and comments to use SET NULL instead of CASCADE
-- This prevents threads and comments from being deleted when a user is deleted

-- Drop existing foreign key constraints
ALTER TABLE threads 
  DROP CONSTRAINT IF EXISTS threads_created_by_fkey;

ALTER TABLE comments 
  DROP CONSTRAINT IF EXISTS comments_created_by_fkey;

-- Recreate foreign key constraints with SET NULL
ALTER TABLE threads 
  ADD CONSTRAINT threads_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

ALTER TABLE comments 
  ADD CONSTRAINT comments_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

