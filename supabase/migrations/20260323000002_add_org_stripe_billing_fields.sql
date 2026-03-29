-- Add Stripe billing fields for org plan tiers
-- Used for storing the platform-owned Stripe customer/subscription for an org.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

