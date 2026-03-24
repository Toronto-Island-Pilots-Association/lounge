-- Seed a public "Demo Lounge" org for demo.clublounge.app
-- Creates the org if it doesn't exist, then enables public access.

INSERT INTO public.organizations (name, slug, subdomain, plan)
VALUES ('Demo Lounge', 'demo', 'demo', 'community')
ON CONFLICT (slug) DO NOTHING;

-- Enable public (guest) access — resolves the org id dynamically
INSERT INTO public.settings (key, value, org_id)
SELECT 'public_access', 'true', id FROM public.organizations WHERE slug = 'demo'
ON CONFLICT (key, org_id) DO UPDATE SET value = 'true';
