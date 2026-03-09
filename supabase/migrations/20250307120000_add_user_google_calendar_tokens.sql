-- Store Google OAuth refresh tokens for Calendar sync (encrypted at rest by app).
-- Used when users sign in with Google and grant calendar scope; enables auto-add on RSVP.
-- Requires: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET (same as Supabase Google provider),
-- GOOGLE_CALENDAR_ENCRYPTION_KEY (e.g. 32+ char secret), and Calendar scope in Google OAuth consent.
CREATE TABLE IF NOT EXISTS user_google_calendar_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_google_calendar_tokens_user_id ON user_google_calendar_tokens(user_id);

ALTER TABLE user_google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can insert/update/select only their own token (callback writes, RSVP flow reads via service role or same user)
CREATE POLICY "Users can manage own google calendar token"
  ON user_google_calendar_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_google_calendar_tokens IS 'Encrypted Google OAuth refresh tokens for adding RSVP events to user Google Calendar';
