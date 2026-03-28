-- Live flags from Stripe Connect Account (synced on return, integrations refresh, account.updated webhook)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Best-effort backfill: previously we only stored onboarding_complete when charges_enabled was true
UPDATE public.organizations
SET stripe_charges_enabled = stripe_onboarding_complete
WHERE stripe_charges_enabled IS NOT TRUE AND stripe_onboarding_complete IS TRUE;
