-- Patch: apply TIPA-specific settings that were added to the consolidated migration
-- after clublounge-dev had already recorded it as applied.

UPDATE public.organizations
SET stripe_charges_enabled = true
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

INSERT INTO public.settings (key, value, org_id, updated_at) VALUES
  ('bylaws_url',            'https://tipa.ca/tipa-by-laws/',      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('membership_policy_url', 'https://tipa.ca/membership-policy/', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now())
ON CONFLICT (key, org_id) DO UPDATE SET value = EXCLUDED.value;
