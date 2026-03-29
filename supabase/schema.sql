-- =============================================================================
-- ClubLounge / TIPA — database schema reference (public)
-- =============================================================================
--
-- CANONICAL SOURCE:
--   supabase/migrations/20260329100000_clublounge_multitenant_consolidated.sql
--   plus subsequent branch migrations (for example pages, custom-domain verification,
--   and editor-role support)
--   supabase db push          (linked remote)
--   supabase db reset         (local: migrations + seeds/demo_org.sql bootstrap; full demo: npm run db:seed-demo-org)
--
-- This file is NOT a full greenfield bootstrap script. Use it for: human-readable
-- inventory, SQL Editor patches, and idempotent snippets below (legacy DBs only).
--
-- Last reviewed: 2026-03-29 (through 20260329191500_seed_tipa_about_page.sql).
--
-- -----------------------------------------------------------------------------
-- Core tables (final shape — conceptual)
-- -----------------------------------------------------------------------------
--
-- public.organizations
--   id uuid PK, name, slug UNIQUE, custom_domain UNIQUE, subdomain UNIQUE,
--   logo_url, created_at, updated_at,
--   custom_domain_verified                      -- DNS/domain verification state
--   stripe_account_id, stripe_onboarding_complete,
--   stripe_charges_enabled, stripe_payouts_enabled,
--   plan text NOT NULL DEFAULT 'hobby',
--   stripe_customer_id, stripe_subscription_id  -- platform billing (plan tiers)
--   trial_ends_at                               -- org-level SaaS trial end
--   favicon_url                                 -- optional tab icon
--
-- public.user_profiles   (global identity — one row per auth user)
--   id uuid PK, user_id uuid UNIQUE NOT NULL -> auth.users(id),
--   email, full_name, first_name, last_name, phone,
--   street, city, province_state, postal_zip_code, country,
--   profile_picture_url, notify_replies, interests,
--   created_at, updated_at
--
-- public.org_memberships   (tenant membership — one row per user per org)
--   id uuid PK, user_id, org_id -> organizations(id), UNIQUE (user_id, org_id),
--   role ('member' | 'editor' | 'admin'),
--   status, membership_level (free text), membership_class, member_number,
--   membership_expires_at, invited_at, last_reminder_sent_at, reminder_count,
--   stripe_subscription_id, stripe_customer_id, paypal_subscription_id,
--   subscription_cancel_at_period_end,
--   statement_of_interest, interests, how_did_you_hear,
--   is_copa_member, join_copa_flight_32, copa_membership_number,
--   pilot_license_type, aircraft_type, call_sign, how_often_fly_from_ytz,
--   is_student_pilot, flight_school, instructor_name, custom_data jsonb,
--   created_at, updated_at
--
-- public.settings
--   PRIMARY KEY (key, org_id) — org_id -> organizations(id) ON DELETE CASCADE
--   key, value, description, updated_by, created_at, updated_at
--   Includes membership_levels_config JSON, feature flags, club identity, etc.
--
-- public.pages
--   id uuid PK, org_id -> organizations(id), title, slug, content, image_url,
--   published boolean default false, created_at, updated_at,
--   UNIQUE (org_id, slug)
--
-- Tenant-scoped tables (all have org_id NOT NULL -> organizations):
--   resources, events, event_rsvps, threads, comments, reactions,
--   notifications, payments
--
-- public.member_profiles — VIEW joining org_memberships + user_profiles
--
-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Idempotent snippets (optional patches on DBs missing newer columns)
-- New projects: use consolidated migration only.
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.reset_custom_domain_verified()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.custom_domain IS DISTINCT FROM OLD.custom_domain THEN
    NEW.custom_domain_verified := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_custom_domain_verified ON public.organizations;
CREATE TRIGGER trg_reset_custom_domain_verified
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.reset_custom_domain_verified();

ALTER TABLE public.org_memberships
  DROP CONSTRAINT IF EXISTS org_memberships_role_check;

ALTER TABLE public.org_memberships
  ADD CONSTRAINT org_memberships_role_check
  CHECK (role IN ('member', 'editor', 'admin'));

CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE INDEX IF NOT EXISTS pages_org_id_slug_idx ON public.pages (org_id, slug);
CREATE INDEX IF NOT EXISTS pages_org_id_published_idx ON public.pages (org_id, published);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pages_updated_at ON public.pages;
CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_pages_updated_at();

DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages" ON public.pages
  FOR ALL
  USING (
    org_id IN (
      SELECT m.org_id FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT m.org_id FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'editor')
    )
  );

-- =============================================================================
-- PostgREST / API role grants
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_memberships TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
