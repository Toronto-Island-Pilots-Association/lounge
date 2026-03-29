-- Restore TIPA aviation / COPA signup fields as explicit custom fields.
-- These were stripped by 20260329115000; now stored explicitly so any org
-- (including TIPA) can have them without requiring them as universal defaults.
--
-- Also fixes LEGACY_SIGNUP_FIELD_KEYS in code (now empty set) so that
-- explicitly-stored custom fields with these keys are no longer filtered out.

DO $$
DECLARE
  v_org_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; -- TIPA
  v_fields text := '[
    {"key":"phone","label":"Phone","group":"contact","enabled":true,"required":false},
    {"key":"address","label":"Mailing Address","group":"address","enabled":true,"required":false},
    {"key":"membership_class","label":"Membership Class","group":"membership","enabled":true,"required":true},
    {"key":"pilot_license_type","label":"Pilot Licence Type","group":"aviation","enabled":true,"required":true,"isCustom":true,"type":"select","options":["Student Pilot","Recreational Pilot Permit","Private Pilot Licence (PPL)","Commercial Pilot Licence (CPL)","Airline Transport Pilot Licence (ATPL)","Ultra-Light Pilot Permit","Other / Non-Pilot"]},
    {"key":"aircraft_type","label":"Aircraft Type(s) You Fly","group":"aviation","enabled":true,"required":false,"isCustom":true,"type":"text","placeholder":"e.g. Cessna 172, Piper Cherokee"},
    {"key":"call_sign","label":"Radio Call Sign","group":"aviation","enabled":false,"required":false,"isCustom":true,"type":"text","placeholder":"e.g. CGABC"},
    {"key":"fly_frequency","label":"How Often Do You Fly?","group":"aviation","enabled":true,"required":false,"isCustom":true,"type":"select","options":["Daily","Several times a week","Once a week","A few times a month","A few times a year","Rarely / Not currently flying"]},
    {"key":"student_pilot","label":"Currently a Student Pilot?","group":"aviation","enabled":true,"required":false,"isCustom":true,"type":"boolean"},
    {"key":"copa_membership","label":"COPA Membership Number","group":"aviation","enabled":true,"required":false,"isCustom":true,"type":"text","placeholder":"e.g. 12345","helpText":"Canadian Owners and Pilots Association — leave blank if not a member"},
    {"key":"statement_of_interest","label":"Why Do You Want to Join?","group":"application","enabled":true,"required":false},
    {"key":"how_did_you_hear","label":"How Did You Hear About Us?","group":"application","enabled":true,"required":false}
  ]';
BEGIN
  INSERT INTO settings (key, value, org_id)
  VALUES ('signup_fields_config', v_fields, v_org_id)
  ON CONFLICT (key, org_id) DO UPDATE SET value = EXCLUDED.value;
END;
$$;
