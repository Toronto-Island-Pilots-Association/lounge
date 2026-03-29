-- Set TIPA-specific nav label for discussions section
insert into settings (org_id, key, value, updated_at)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'discussions_label',
  'Hangar Talk',
  now()
)
on conflict (key, org_id) do update set value = excluded.value, updated_at = now();
