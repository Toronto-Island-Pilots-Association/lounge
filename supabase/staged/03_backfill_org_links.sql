-- Stage 3: backfill all existing single-tenant content to the TIPA org.
-- This stage should remain additive. Do not drop old user_profiles membership
-- columns here.

do $$
declare
  tipa uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
begin
  alter table public.user_profiles disable trigger user;

  update public.user_profiles
  set
    user_id = coalesce(user_id, id),
    org_id = tipa
  where user_id is null or org_id is null;

  alter table public.user_profiles enable trigger user;

  update public.resources set org_id = tipa where org_id is null;
  update public.events set org_id = tipa where org_id is null;
  update public.event_rsvps set org_id = tipa where org_id is null;
  update public.threads set org_id = tipa where org_id is null;
  update public.comments set org_id = tipa where org_id is null;
  update public.reactions set org_id = tipa where org_id is null;
  update public.notifications set org_id = tipa where org_id is null;
  update public.payments set org_id = tipa where org_id is null;
  update public.settings set org_id = tipa where org_id is null;
end $$;

alter table public.user_profiles
  drop constraint if exists user_profiles_id_fkey;

do $$ begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'user_profiles_user_id_fkey'
      and table_name = 'user_profiles'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

alter table public.user_profiles
  alter column user_id set not null,
  alter column org_id set not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_user_org_unique;

alter table public.user_profiles
  add constraint user_profiles_user_org_unique unique (user_id, org_id);

alter table public.resources alter column org_id set not null;
alter table public.events alter column org_id set not null;
alter table public.event_rsvps alter column org_id set not null;
alter table public.threads alter column org_id set not null;
alter table public.comments alter column org_id set not null;
alter table public.reactions alter column org_id set not null;
alter table public.notifications alter column org_id set not null;
alter table public.payments alter column org_id set not null;

alter table public.settings alter column org_id set not null;
alter table public.settings drop constraint if exists settings_pkey;
alter table public.settings add primary key (key, org_id);

alter table public.resources alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
alter table public.events alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
alter table public.event_rsvps alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
alter table public.threads alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
alter table public.comments alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
alter table public.reactions alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
alter table public.notifications alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
alter table public.payments alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
alter table public.settings alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
