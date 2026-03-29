-- =============================================================================
-- Demo tenant — bootstrap only (runs on `supabase db reset`)
-- =============================================================================
-- This file intentionally does **not** create auth users, threads, events, etc.
-- Postgres seeds cannot call Supabase Auth; those live in the app layer.
--
-- Full demo (members, discussions, calendar, resources, payments, settings):
--   npm run db:seed-demo-org
--
-- Source of truth for the rich dataset: scripts/seed-demo-org.ts
-- Archive copy of the old one-table seed: migrations_archive/multi_tenancy/
--   20260323000006_seed_demo_org.sql
-- =============================================================================

-- Align name with scripts/seed-demo-org.ts (slug demo); TS deletes/recreates this org when run.
INSERT INTO public.organizations (name, slug, subdomain, plan)
VALUES ('Lakeside Sports Club', 'demo', 'demo', 'community')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.settings (key, value, org_id)
SELECT 'public_access', 'true', id FROM public.organizations WHERE slug = 'demo'
ON CONFLICT (key, org_id) DO UPDATE SET value = 'true';
