-- Add "Building a Better TIPA" discussion category to threads
ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_category_check;
ALTER TABLE threads ADD CONSTRAINT threads_category_check CHECK (
  category IN (
    'aircraft_shares',
    'instructor_availability',
    'gear_for_sale',
    'flying_at_ytz',
    'general_aviation',
    'training_safety_proficiency',
    'wanted',
    'building_a_better_tipa',
    'other'
  )
);
