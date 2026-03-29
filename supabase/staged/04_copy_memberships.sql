-- Stage 4: copy legacy membership state into org_memberships.
-- Keep legacy columns on user_profiles intact for now.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'role'
  ) then
    insert into public.org_memberships (
      id, user_id, org_id,
      role, status, membership_level, membership_class, member_number, membership_expires_at,
      invited_at, last_reminder_sent_at, reminder_count,
      stripe_subscription_id, stripe_customer_id, paypal_subscription_id, subscription_cancel_at_period_end,
      statement_of_interest, interests, how_did_you_hear,
      is_copa_member, join_copa_flight_32, copa_membership_number,
      pilot_license_type, aircraft_type, call_sign, how_often_fly_from_ytz,
      is_student_pilot, flight_school, instructor_name,
      custom_data, created_at, updated_at
    )
    select
      id,
      user_id,
      coalesce(org_id, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid),
      role, status, membership_level, membership_class, member_number, membership_expires_at,
      invited_at, last_reminder_sent_at, coalesce(reminder_count, 0),
      stripe_subscription_id, stripe_customer_id, paypal_subscription_id, coalesce(subscription_cancel_at_period_end, false),
      statement_of_interest, interests, how_did_you_hear,
      is_copa_member, join_copa_flight_32, copa_membership_number,
      pilot_license_type, aircraft_type, call_sign, how_often_fly_from_ytz,
      coalesce(is_student_pilot, false), flight_school, instructor_name,
      custom_data, created_at, updated_at
    from public.user_profiles
    on conflict (user_id, org_id) do nothing;
  end if;
end $$;

alter table public.org_memberships alter column org_id set default 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;

alter table public.org_memberships enable row level security;

drop policy if exists "Members can view org memberships" on public.org_memberships;
create policy "Members can view org memberships"
  on public.org_memberships for select
  using (
    public.is_org_admin(auth.uid(), org_id)
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own membership" on public.org_memberships;
create policy "Users can update own membership"
  on public.org_memberships for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and role = (
      select role
      from public.org_memberships
      where user_id = auth.uid()
        and org_id = org_memberships.org_id
    )
    and status = (
      select status
      from public.org_memberships
      where user_id = auth.uid()
        and org_id = org_memberships.org_id
    )
    and membership_level = (
      select membership_level
      from public.org_memberships
      where user_id = auth.uid()
        and org_id = org_memberships.org_id
    )
  );

drop policy if exists "Admins can update all memberships" on public.org_memberships;
create policy "Admins can update all memberships"
  on public.org_memberships for update
  using (public.is_org_admin(auth.uid(), org_id));

drop policy if exists "Service role can insert memberships" on public.org_memberships;
create policy "Service role can insert memberships"
  on public.org_memberships for insert
  with check (auth.role() = 'service_role');

create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.org_memberships om
    where om.user_id = is_admin.user_id
      and om.role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

create or replace function public.is_org_admin(p_user_id uuid, p_org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.org_memberships
    where user_id = p_user_id
      and org_id = p_org_id
      and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

create or replace function public.generate_member_number(p_org_id uuid)
returns text as $$
declare
  next_number integer;
begin
  select coalesce(max(cast(member_number as integer)), 0) + 1
  into next_number
  from public.org_memberships
  where org_id = p_org_id
    and member_number is not null
    and member_number ~ '^[0-9]+$'
    and length(member_number) <= 6;
  return lpad(next_number::text, 6, '0');
end;
$$ language plpgsql;

drop trigger if exists assign_member_number_trigger on public.user_profiles;
drop trigger if exists assign_member_number_trigger on public.org_memberships;

create or replace function public.assign_member_number_on_approval()
returns trigger as $$
begin
  if new.status = 'approved'
     and (new.member_number is null or new.member_number = '')
     and (old.status is null or old.status != 'approved') then
    new.member_number := public.generate_member_number(new.org_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger assign_member_number_trigger
  before update on public.org_memberships
  for each row execute function public.assign_member_number_on_approval();
