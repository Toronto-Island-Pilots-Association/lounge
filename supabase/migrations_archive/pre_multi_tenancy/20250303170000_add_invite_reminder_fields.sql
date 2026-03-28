-- Add fields to track invite reminder sends (rate limit: 24h cooldown, max 3 reminders)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_profiles.last_reminder_sent_at IS 'When the last invitation reminder email was sent (for rate limiting).';
COMMENT ON COLUMN public.user_profiles.reminder_count IS 'Number of reminder emails sent after the initial invite (max 3).';
