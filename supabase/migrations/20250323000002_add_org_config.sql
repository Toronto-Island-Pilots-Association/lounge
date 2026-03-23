-- Org-level configuration settings: club identity, features, enabled levels, signup fields, email templates

-- Default signup fields config JSON (stored as a setting value)
-- Keys map to sections/fields on the become-a-member form
-- TIPA-specific fields (copa_membership, fly_frequency) default to disabled for new orgs

-- Update create_default_org_settings to include all new settings
CREATE OR REPLACE FUNCTION create_default_org_settings(p_org_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO settings (key, value, org_id) VALUES
    -- Membership fees (CAD)
    ('membership_fee_full',         '45',                     p_org_id),
    ('membership_fee_student',      '25',                     p_org_id),
    ('membership_fee_associate',    '25',                     p_org_id),
    ('membership_fee_corporate',    '125',                    p_org_id),
    ('membership_fee_honorary',     '0',                      p_org_id),
    -- Trial config
    ('trial_type_full',             'sept1',                  p_org_id),
    ('trial_type_student',          'months',                 p_org_id),
    ('trial_months_student',        '12',                     p_org_id),
    ('trial_type_associate',        'sept1',                  p_org_id),
    ('trial_type_corporate',        'none',                   p_org_id),
    ('trial_type_honorary',         'none',                   p_org_id),
    -- Club identity
    ('club_description',            '',                       p_org_id),
    ('contact_email',               '',                       p_org_id),
    ('website_url',                 '',                       p_org_id),
    ('accent_color',                '#0d1e26',                p_org_id),
    ('club_display_name',           '',                       p_org_id),
    ('timezone',                    'America/Toronto',        p_org_id),
    -- Features
    ('feature_discussions',         'true',                   p_org_id),
    ('feature_events',              'true',                   p_org_id),
    ('feature_resources',           'true',                   p_org_id),
    ('feature_member_directory',    'true',                   p_org_id),
    ('require_member_approval',     'true',                   p_org_id),
    ('allow_member_invitations',    'true',                   p_org_id),
    -- Enabled membership levels
    ('level_full_enabled',          'true',                   p_org_id),
    ('level_student_enabled',       'true',                   p_org_id),
    ('level_associate_enabled',     'true',                   p_org_id),
    ('level_corporate_enabled',     'true',                   p_org_id),
    ('level_honorary_enabled',      'true',                   p_org_id),
    -- Signup fields config (JSON array of {key, label, group, enabled, required})
    ('signup_fields_config',        '[{"key":"phone","label":"Phone","group":"contact","enabled":true,"required":false},{"key":"address","label":"Mailing Address","group":"address","enabled":true,"required":false},{"key":"membership_class","label":"Membership Class","group":"membership","enabled":true,"required":true},{"key":"aviation_info","label":"Aviation Information","group":"aviation","enabled":true,"required":false},{"key":"fly_frequency","label":"How Often Fly From YTZ","group":"aviation","enabled":false,"required":false},{"key":"student_pilot","label":"Student Pilot Info","group":"student","enabled":true,"required":false},{"key":"copa_membership","label":"COPA Membership","group":"copa","enabled":false,"required":false},{"key":"statement_of_interest","label":"Statement of Interest","group":"application","enabled":true,"required":false},{"key":"interests","label":"Interests","group":"application","enabled":true,"required":false},{"key":"how_did_you_hear","label":"How Did You Hear","group":"application","enabled":true,"required":false}]', p_org_id),
    -- Email templates
    ('welcome_email_subject',       'Welcome!',               p_org_id),
    ('welcome_email_body',          '',                       p_org_id)
  ON CONFLICT (key, org_id) DO NOTHING;
END;
$$;

-- Backfill new settings for all existing orgs (using DO NOTHING so existing values are preserved)
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    INSERT INTO settings (key, value, org_id) VALUES
      -- Club identity
      ('club_description',            '',                       org_record.id),
      ('contact_email',               '',                       org_record.id),
      ('website_url',                 '',                       org_record.id),
      ('accent_color',                '#0d1e26',                org_record.id),
      ('club_display_name',           '',                       org_record.id),
      ('timezone',                    'America/Toronto',        org_record.id),
      -- Features
      ('feature_discussions',         'true',                   org_record.id),
      ('feature_events',              'true',                   org_record.id),
      ('feature_resources',           'true',                   org_record.id),
      ('feature_member_directory',    'true',                   org_record.id),
      ('require_member_approval',     'true',                   org_record.id),
      ('allow_member_invitations',    'true',                   org_record.id),
      -- Enabled levels
      ('level_full_enabled',          'true',                   org_record.id),
      ('level_student_enabled',       'true',                   org_record.id),
      ('level_associate_enabled',     'true',                   org_record.id),
      ('level_corporate_enabled',     'true',                   org_record.id),
      ('level_honorary_enabled',      'true',                   org_record.id),
      -- Signup fields (TIPA gets copa + fly_frequency enabled)
      ('signup_fields_config',        '[{"key":"phone","label":"Phone","group":"contact","enabled":true,"required":false},{"key":"address","label":"Mailing Address","group":"address","enabled":true,"required":false},{"key":"membership_class","label":"Membership Class","group":"membership","enabled":true,"required":true},{"key":"aviation_info","label":"Aviation Information","group":"aviation","enabled":true,"required":false},{"key":"fly_frequency","label":"How Often Fly From YTZ","group":"aviation","enabled":true,"required":false},{"key":"student_pilot","label":"Student Pilot Info","group":"student","enabled":true,"required":false},{"key":"copa_membership","label":"COPA Membership","group":"copa","enabled":true,"required":true},{"key":"statement_of_interest","label":"Statement of Interest","group":"application","enabled":true,"required":false},{"key":"interests","label":"Interests","group":"application","enabled":true,"required":false},{"key":"how_did_you_hear","label":"How Did You Hear","group":"application","enabled":true,"required":false}]', org_record.id),
      -- Email templates
      ('welcome_email_subject',       'Welcome!',               org_record.id),
      ('welcome_email_body',          '',                       org_record.id)
    ON CONFLICT (key, org_id) DO NOTHING;
  END LOOP;
END;
$$;
