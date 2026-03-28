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
