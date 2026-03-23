-- Make membership_level a free-text field so orgs can define their own levels.
-- The old CHECK constraint only allowed TIPA's 5 hardcoded values.

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_membership_level_check;

-- Add consolidated levels config to the default org settings function.
-- Each level: { key, label, fee, trialType, trialMonths?, enabled }
CREATE OR REPLACE FUNCTION create_default_org_settings(p_org_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO settings (key, value, org_id) VALUES
    -- Consolidated membership levels config (replaces individual fee/trial/enabled keys)
    ('membership_levels_config', '[
      {"key":"full",      "label":"Full Member", "fee":45,  "trialType":"sept1",  "enabled":true},
      {"key":"student",   "label":"Student",     "fee":25,  "trialType":"months", "trialMonths":12, "enabled":true},
      {"key":"associate", "label":"Associate",   "fee":25,  "trialType":"sept1",  "enabled":true},
      {"key":"corporate", "label":"Corporate",   "fee":125, "trialType":"none",   "enabled":true},
      {"key":"honorary",  "label":"Honorary",    "fee":0,   "trialType":"none",   "enabled":true}
    ]', p_org_id),
    -- Legacy per-level settings (kept for TIPA backward compat)
    ('membership_fee_full',         '45',      p_org_id),
    ('membership_fee_student',      '25',      p_org_id),
    ('membership_fee_associate',    '25',      p_org_id),
    ('membership_fee_corporate',    '125',     p_org_id),
    ('membership_fee_honorary',     '0',       p_org_id),
    ('trial_type_full',             'sept1',   p_org_id),
    ('trial_type_student',          'months',  p_org_id),
    ('trial_months_student',        '12',      p_org_id),
    ('trial_type_associate',        'sept1',   p_org_id),
    ('trial_type_corporate',        'none',    p_org_id),
    ('trial_type_honorary',         'none',    p_org_id),
    ('level_full_enabled',          'true',    p_org_id),
    ('level_student_enabled',       'true',    p_org_id),
    ('level_associate_enabled',     'true',    p_org_id),
    ('level_corporate_enabled',     'true',    p_org_id),
    ('level_honorary_enabled',      'true',    p_org_id),
    -- Club identity
    ('club_description',    '',                  p_org_id),
    ('contact_email',       '',                  p_org_id),
    ('website_url',         '',                  p_org_id),
    ('accent_color',        '#0d1e26',            p_org_id),
    ('club_display_name',   '',                  p_org_id),
    ('timezone',            'America/Toronto',    p_org_id),
    -- Features
    ('feature_discussions',        'true',  p_org_id),
    ('feature_events',             'true',  p_org_id),
    ('feature_resources',          'true',  p_org_id),
    ('feature_member_directory',   'true',  p_org_id),
    ('require_member_approval',    'true',  p_org_id),
    ('allow_member_invitations',   'true',  p_org_id),
    -- Signup fields config
    ('signup_fields_config', '[{"key":"phone","label":"Phone","group":"contact","enabled":true,"required":false},{"key":"address","label":"Mailing Address","group":"address","enabled":true,"required":false},{"key":"membership_class","label":"Membership Class","group":"membership","enabled":true,"required":true},{"key":"aviation_info","label":"Aviation Information","group":"aviation","enabled":true,"required":false},{"key":"fly_frequency","label":"How Often Fly From YTZ","group":"aviation","enabled":false,"required":false},{"key":"student_pilot","label":"Student Pilot Info","group":"student","enabled":true,"required":false},{"key":"copa_membership","label":"COPA Membership","group":"copa","enabled":false,"required":false},{"key":"statement_of_interest","label":"Statement of Interest","group":"application","enabled":true,"required":false},{"key":"interests","label":"Interests","group":"application","enabled":true,"required":false},{"key":"how_did_you_hear","label":"How Did You Hear","group":"application","enabled":true,"required":false}]', p_org_id),
    -- Email templates
    ('welcome_email_subject', 'Welcome!', p_org_id),
    ('welcome_email_body',    '',         p_org_id)
  ON CONFLICT (key, org_id) DO NOTHING;
END;
$$;

-- Backfill membership_levels_config for all existing orgs that don't have it yet
INSERT INTO settings (key, value, org_id)
SELECT
  'membership_levels_config',
  '[
    {"key":"full",      "label":"Full Member", "fee":45,  "trialType":"sept1",  "enabled":true},
    {"key":"student",   "label":"Student",     "fee":25,  "trialType":"months", "trialMonths":12, "enabled":true},
    {"key":"associate", "label":"Associate",   "fee":25,  "trialType":"sept1",  "enabled":true},
    {"key":"corporate", "label":"Corporate",   "fee":125, "trialType":"none",   "enabled":true},
    {"key":"honorary",  "label":"Honorary",    "fee":0,   "trialType":"none",   "enabled":true}
  ]',
  id
FROM organizations
ON CONFLICT (key, org_id) DO NOTHING;
