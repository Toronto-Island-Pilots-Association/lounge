-- No org-specific built-in signup sections: generic presets only.
-- Legacy aviation/YTZ/COPA keys are removed from stored config (including TIPA);
-- those questions are modeled as custom fields per org when needed.

-- 1) Drop legacy built-in keys from signup_fields_config for all orgs
UPDATE settings s
SET value = COALESCE(
  (
    SELECT jsonb_agg(elem ORDER BY ord)::text
    FROM jsonb_array_elements(s.value::jsonb) WITH ORDINALITY AS t(elem, ord)
    WHERE elem->>'key' NOT IN (
      'aviation_info',
      'fly_frequency',
      'student_pilot',
      'copa_membership'
    )
  ),
  '[]'
)
WHERE s.key = 'signup_fields_config'
  AND s.value LIKE '%aviation_info%';

-- 2) New orgs: always seed the same generic signup JSON
CREATE OR REPLACE FUNCTION create_default_org_settings(p_org_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_signup text := '[{"key":"phone","label":"Phone","group":"contact","enabled":true,"required":false},'
    || '{"key":"address","label":"Mailing Address","group":"address","enabled":true,"required":false},'
    || '{"key":"statement_of_interest","label":"Statement of Interest","group":"application","enabled":true,"required":false},'
    || '{"key":"interests","label":"Interests","group":"application","enabled":true,"required":false},'
    || '{"key":"how_did_you_hear","label":"How Did You Hear","group":"application","enabled":true,"required":false},'
    || '{"key":"membership_class","label":"Membership Class","group":"membership","enabled":true,"required":true}]';
BEGIN
  INSERT INTO settings (key, value, org_id) VALUES
    ('membership_levels_config', '[
      {"key":"full",      "label":"Full Member", "fee":45,  "trialType":"sept1",  "enabled":true},
      {"key":"student",   "label":"Student",     "fee":25,  "trialType":"months", "trialMonths":12, "enabled":true},
      {"key":"associate", "label":"Associate",   "fee":25,  "trialType":"sept1",  "enabled":true},
      {"key":"corporate", "label":"Corporate",   "fee":125, "trialType":"none",    "enabled":true},
      {"key":"honorary",  "label":"Honorary",    "fee":0,   "trialType":"none",    "enabled":true}
    ]', p_org_id),
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
    ('club_description',    '',                  p_org_id),
    ('contact_email',       '',                  p_org_id),
    ('website_url',         '',                  p_org_id),
    ('accent_color',        '#0d1e26',            p_org_id),
    ('club_display_name',   '',                  p_org_id),
    ('timezone',            'America/Toronto',    p_org_id),
    ('feature_discussions',        'true',  p_org_id),
    ('feature_events',             'true',  p_org_id),
    ('feature_resources',          'true',  p_org_id),
    ('feature_member_directory',   'true',  p_org_id),
    ('require_member_approval',    'true',  p_org_id),
    ('allow_member_invitations',   'true',  p_org_id),
    ('signup_fields_config', v_signup, p_org_id),
    ('welcome_email_subject', 'Welcome!', p_org_id),
    ('welcome_email_body',    '',         p_org_id)
  ON CONFLICT (key, org_id) DO NOTHING;
END;
$$;
