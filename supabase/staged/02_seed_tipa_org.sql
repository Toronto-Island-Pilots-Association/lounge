-- Stage 2: seed TIPA as the founding org.
-- Important invariant: TIPA remains legacy direct Stripe for dues.

insert into public.organizations (
  id,
  name,
  slug,
  custom_domain,
  subdomain,
  stripe_charges_enabled
)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Toronto Island Pilots Association',
  'tipa',
  'lounge.tipa.ca',
  'tipa',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  custom_domain = excluded.custom_domain,
  subdomain = excluded.subdomain,
  stripe_charges_enabled = true;

update public.organizations
set plan = 'club_pro'
where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

insert into public.settings (key, value, org_id, updated_at) values
  ('bylaws_url', 'https://tipa.ca/tipa-by-laws/', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('membership_policy_url', 'https://tipa.ca/membership-policy/', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now()),
  ('discussions_label', 'Hangar Talk', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', now())
on conflict (key, org_id) do update
set value = excluded.value, updated_at = now();
