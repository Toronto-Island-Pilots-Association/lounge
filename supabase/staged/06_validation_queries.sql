-- Validation queries after stages 01-05 and before deploying the branch.

select count(*) as organizations_count from public.organizations;
select count(*) as org_memberships_count from public.org_memberships;
select count(*) as member_profiles_count from public.member_profiles;

select count(*) as threads_without_org from public.threads where org_id is null;
select count(*) as comments_without_org from public.comments where org_id is null;
select count(*) as resources_without_org from public.resources where org_id is null;
select count(*) as events_without_org from public.events where org_id is null;
select count(*) as payments_without_org from public.payments where org_id is null;
select count(*) as settings_without_org from public.settings where org_id is null;

select role, status, count(*) as memberships
from public.org_memberships
group by 1, 2
order by 1, 2;

select membership_level, count(*) as memberships
from public.org_memberships
group by 1
order by 2 desc, 1;

select id, name, slug, custom_domain, subdomain, plan, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled
from public.organizations
order by created_at asc;

select count(*) as tipa_members
from public.org_memberships
where org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

select key, value
from public.settings
where org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  and key in (
    'bylaws_url',
    'membership_policy_url',
    'discussions_label',
    'discussion_categories_config',
    'signup_fields_config'
  )
order by key;
