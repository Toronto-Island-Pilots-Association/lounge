-- =============================================================================
-- ClubLounge / TIPA — database schema reference (public)
-- =============================================================================
--
-- CANONICAL SOURCE: apply files in supabase/migrations/ in timestamp order.
--   supabase db push          (linked remote)
--   supabase db reset         (local, reapplies all migrations)
--
-- This file is NOT a full greenfield bootstrap script. The multi-tenant layout
-- is defined incrementally in migrations (notably 20260323000001_squashed_*).
-- Use this file for: quick human-readable inventory, SQL Editor patches, and
-- idempotent ADD COLUMN / GRANT snippets below.
--
-- Last reviewed: 2026-03-28 (includes organizations.favicon_url, trial_ends_at,
-- platform Stripe billing columns on organizations, org_memberships, composite
-- settings PK, member_profiles view).
--
-- -----------------------------------------------------------------------------
-- Core tables (final shape — conceptual)
-- -----------------------------------------------------------------------------
--
-- public.organizations
--   id uuid PK, name, slug UNIQUE, custom_domain UNIQUE, subdomain UNIQUE,
--   logo_url, created_at, updated_at,
--   stripe_account_id, stripe_onboarding_complete,
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
--   role, status, membership_level (free text), membership_class, member_number,
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
-- Idempotent column adds (migrations after squashed multi-tenancy)
-- Safe to run on a database that already has the squashed migration applied.
-- =============================================================================

-- 20260323000002_add_org_stripe_billing_fields.sql
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 20260323000005_org_trial_period.sql
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 20260328000007_org_favicon_url.sql
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- =============================================================================
-- PostgREST / API role grants (20260323000003_grant_table_permissions.sql)
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_memberships TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
