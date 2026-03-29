-- Stage 5: restore TIPA parity from org settings/custom fields.
-- This stage keeps migrated TIPA behaving like TIPA without relying on scattered
-- hardcoded defaults.

insert into public.settings (key, value, org_id, updated_at) values
  ('public_home_template', 'tipa_legacy', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('hidden_public_page_slugs', '["about"]', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('stripe_billing_mode', 'direct', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('plan_price_monthly_override_club_pro', '0', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('discussion_categories_config',
   '[{"slug":"introduce_yourself","label":"Introduce Yourself","emoji":"👋","type":"discussion","enabled":true},{"slug":"flying_at_ytz","label":"Flying at YTZ","emoji":"🛫","type":"discussion","enabled":true},{"slug":"general_aviation","label":"General Aviation","emoji":"🌐","type":"discussion","enabled":true},{"slug":"training_safety_proficiency","label":"Training, Safety & Proficiency","emoji":"📚","type":"discussion","enabled":true},{"slug":"building_a_better_tipa","label":"Building a Better TIPA","emoji":"🏗️","type":"discussion","enabled":true},{"slug":"other","label":"Other","emoji":"📋","type":"discussion","enabled":true},{"slug":"aircraft_shares","label":"Aircraft Shares / Block Time","emoji":"✈️","type":"classified","enabled":true},{"slug":"instructor_availability","label":"Instructor Availability","emoji":"👨‍✈️","type":"classified","enabled":true},{"slug":"gear_for_sale","label":"Gear for Sale","emoji":"🛒","type":"classified","enabled":true},{"slug":"wanted","label":"Wanted","emoji":"🔍","type":"classified","enabled":true}]',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   now())
on conflict (key, org_id) do update
set value = excluded.value, updated_at = now();

update public.settings s
set value = coalesce(
  (
    select jsonb_agg(elem order by ord)::text
    from jsonb_array_elements(s.value::jsonb) with ordinality as t(elem, ord)
    where elem->>'key' not in (
      'aviation_info',
      'fly_frequency',
      'student_pilot',
      'copa_membership'
    )
  ),
  '[]'
)
where s.key = 'signup_fields_config'
  and s.value like '%aviation_info%';

do $$
declare
  v_org_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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
begin
  insert into public.settings (key, value, org_id)
  values ('signup_fields_config', v_fields, v_org_id)
  on conflict (key, org_id) do update
  set value = excluded.value;
end;
$$;
