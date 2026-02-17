-- Store whether member's Stripe subscription is set to cancel at period end (for admin view)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false;
