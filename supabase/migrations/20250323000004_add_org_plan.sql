-- Add plan column to organizations
-- Plans: hobby ($5), starter ($49), community ($99), club_pro ($199)

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'hobby';

-- Grant existing orgs their appropriate plan.
-- TIPA is our flagship customer and gets Club Pro.
UPDATE public.organizations
  SET plan = 'club_pro'
  WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Any other orgs that were created before this migration
-- (besides TIPA) get community as a generous default.
UPDATE public.organizations
  SET plan = 'community'
  WHERE id != 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND plan = 'hobby';
