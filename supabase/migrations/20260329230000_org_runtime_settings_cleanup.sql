-- Replace legacy runtime org-ID branches with explicit per-org settings.
-- This keeps founder-org behavior data-driven while the app removes TIPA_ORG_ID checks.

INSERT INTO public.settings (key, value, org_id, updated_at) VALUES
  ('public_home_template', 'tipa_legacy', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('hidden_public_page_slugs', '["about"]', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('stripe_billing_mode', 'direct', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('plan_price_monthly_override_club_pro', '0', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now())
ON CONFLICT (key, org_id) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
