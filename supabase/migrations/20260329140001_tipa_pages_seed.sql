-- Seed TIPA's existing frontdoor content (https://lounge.tipa.ca/)
-- as a published Page, migrating it into the new Pages feature.
--
-- TODO: Replace the placeholder content below with the actual body from
-- https://lounge.tipa.ca/ before running this migration.
-- This migration is intentionally a no-op until the content is filled in.

DO $$
DECLARE
  v_org_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; -- TIPA_ORG_ID
BEGIN
  -- Only run if the TIPA org exists
  IF EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
    INSERT INTO pages (org_id, title, slug, content, published)
    VALUES (
      v_org_id,
      'About TIPA',
      'about',
      -- Replace with actual HTML content from https://lounge.tipa.ca/
      '<p>Welcome to the Toronto Island Pilots Association (TIPA). Replace this placeholder with the real frontdoor content.</p>',
      true
    )
    ON CONFLICT (org_id, slug) DO NOTHING;
  END IF;
END $$;
