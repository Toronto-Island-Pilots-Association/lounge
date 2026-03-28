-- Seed TIPA's aviation-specific discussion categories.
-- New orgs get a 5-category generic set from create_default_org_settings;
-- TIPA needs the full YTZ/aviation set that was previously hardcoded in constants.ts.

INSERT INTO public.settings (key, value, org_id, updated_at) VALUES
  ('discussion_categories_config',
   '[{"slug":"introduce_yourself","label":"Introduce Yourself","emoji":"👋","type":"discussion","enabled":true},{"slug":"flying_at_ytz","label":"Flying at YTZ","emoji":"🛫","type":"discussion","enabled":true},{"slug":"general_aviation","label":"General Aviation","emoji":"🌐","type":"discussion","enabled":true},{"slug":"training_safety_proficiency","label":"Training, Safety & Proficiency","emoji":"📚","type":"discussion","enabled":true},{"slug":"building_a_better_tipa","label":"Building a Better TIPA","emoji":"🏗️","type":"discussion","enabled":true},{"slug":"other","label":"Other","emoji":"📋","type":"discussion","enabled":true},{"slug":"aircraft_shares","label":"Aircraft Shares / Block Time","emoji":"✈️","type":"classified","enabled":true},{"slug":"instructor_availability","label":"Instructor Availability","emoji":"👨‍✈️","type":"classified","enabled":true},{"slug":"gear_for_sale","label":"Gear for Sale","emoji":"🛒","type":"classified","enabled":true},{"slug":"wanted","label":"Wanted","emoji":"🔍","type":"classified","enabled":true}]',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   now())
ON CONFLICT (key, org_id) DO UPDATE SET value = EXCLUDED.value;
