-- If an earlier revision of 20260329115000 left TIPA exempt, strip legacy aviation
-- built-in keys here (idempotent — no-op when already removed).

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
  AND s.org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
  AND s.value LIKE '%aviation_info%';
