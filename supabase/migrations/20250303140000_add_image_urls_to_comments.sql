-- Add image_urls to comments (optional array of image URLs, same pattern as threads)
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT NULL;

COMMENT ON COLUMN comments.image_urls IS 'Optional array of image URLs (e.g. from storage); max 3 recommended.';
