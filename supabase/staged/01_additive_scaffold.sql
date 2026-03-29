-- Stage 1: additive multi-tenant scaffold
-- Safe intent:
-- - add new tables/columns/functions
-- - do not drop legacy user_profiles membership columns
-- - do not switch app reads yet

create extension if not exists "uuid-ossp";

do $$ begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organizations'
  ) then
    create table public.organizations (
      id uuid primary key default uuid_generate_v4(),
      name text not null,
      slug text unique not null,
      custom_domain text unique,
      subdomain text unique,
      logo_url text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    alter table public.organizations enable row level security;

    create policy "Public can view organizations"
      on public.organizations for select
      using (true);

    create trigger update_organizations_updated_at
      before update on public.organizations
      for each row execute function public.update_updated_at_column();
  end if;
end $$;

alter table public.organizations
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarding_complete boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists favicon_url text,
  add column if not exists custom_domain_verified boolean not null default false;

create or replace function public.reset_custom_domain_verified()
returns trigger language plpgsql as $$
begin
  if new.custom_domain is distinct from old.custom_domain then
    new.custom_domain_verified := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_custom_domain_verified on public.organizations;
create trigger trg_reset_custom_domain_verified
  before update on public.organizations
  for each row execute function public.reset_custom_domain_verified();

alter table public.user_profiles
  add column if not exists user_id uuid,
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.resources add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.events add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.event_rsvps add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.threads add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.comments add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.reactions add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.notifications add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.payments add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.settings add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_user_profiles_org_id on public.user_profiles(org_id);
create index if not exists idx_user_profiles_user_id on public.user_profiles(user_id);
create index if not exists idx_resources_org_id on public.resources(org_id);
create index if not exists idx_events_org_id on public.events(org_id);
create index if not exists idx_event_rsvps_org_id on public.event_rsvps(org_id);
create index if not exists idx_threads_org_id on public.threads(org_id);
create index if not exists idx_comments_org_id on public.comments(org_id);
create index if not exists idx_reactions_org_id on public.reactions(org_id);
create index if not exists idx_notifications_org_id on public.notifications(org_id);
create index if not exists idx_payments_org_id on public.payments(org_id);

create table if not exists public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  membership_level text not null default 'Associate',
  membership_class text,
  member_number text,
  membership_expires_at timestamptz,
  invited_at timestamptz,
  last_reminder_sent_at timestamptz,
  reminder_count integer not null default 0,
  stripe_subscription_id text,
  stripe_customer_id text,
  paypal_subscription_id text,
  subscription_cancel_at_period_end boolean not null default false,
  statement_of_interest text,
  interests text,
  how_did_you_hear text,
  is_copa_member text,
  join_copa_flight_32 text,
  copa_membership_number text,
  pilot_license_type text,
  aircraft_type text,
  call_sign text,
  how_often_fly_from_ytz text,
  is_student_pilot boolean not null default false,
  flight_school text,
  instructor_name text,
  custom_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, org_id)
);

create index if not exists idx_org_memberships_user_id on public.org_memberships(user_id);
create index if not exists idx_org_memberships_org_id on public.org_memberships(org_id);
create index if not exists idx_org_memberships_status on public.org_memberships(org_id, status);

drop trigger if exists update_org_memberships_updated_at on public.org_memberships;
create trigger update_org_memberships_updated_at
  before update on public.org_memberships
  for each row execute function public.update_updated_at_column();

create or replace view public.member_profiles as
select
  om.id,
  om.user_id,
  om.org_id,
  om.role,
  om.status,
  om.membership_level,
  om.membership_class,
  om.member_number,
  om.membership_expires_at,
  om.invited_at,
  om.last_reminder_sent_at,
  om.reminder_count,
  om.stripe_subscription_id,
  om.stripe_customer_id,
  om.paypal_subscription_id,
  om.subscription_cancel_at_period_end,
  om.statement_of_interest,
  om.interests,
  om.how_did_you_hear,
  om.is_copa_member,
  om.join_copa_flight_32,
  om.copa_membership_number,
  om.pilot_license_type,
  om.aircraft_type,
  om.call_sign,
  om.how_often_fly_from_ytz,
  om.is_student_pilot,
  om.flight_school,
  om.instructor_name,
  om.custom_data,
  om.created_at,
  om.updated_at,
  up.email,
  up.full_name,
  up.first_name,
  up.last_name,
  up.phone,
  up.street,
  up.city,
  up.province_state,
  up.postal_zip_code,
  up.country,
  up.profile_picture_url,
  up.notify_replies
from public.org_memberships om
join public.user_profiles up on up.user_id = om.user_id;

grant select, insert, update, delete on public.organizations to anon, authenticated, service_role;
grant select, insert, update, delete on public.org_memberships to anon, authenticated, service_role;
grant select, insert, update, delete on public.settings to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
