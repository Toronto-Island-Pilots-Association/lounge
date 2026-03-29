-- Stage 8: destructive cleanup
-- Run only after:
-- - stages 01-06 are complete
-- - branch code is deployed
-- - post-deploy checks pass
-- Rollback for this stage should be restore-based, not manual SQL.

drop policy if exists "Users can update own profile" on public.user_profiles;
drop policy if exists "Admins can update all profiles" on public.user_profiles;
drop policy if exists "Service role can insert profiles" on public.user_profiles;

alter table public.user_profiles
  drop constraint if exists user_profiles_user_org_unique,
  drop column if exists org_id,
  drop column if exists role,
  drop column if exists status,
  drop column if exists membership_level,
  drop column if exists membership_class,
  drop column if exists member_number,
  drop column if exists membership_expires_at,
  drop column if exists invited_at,
  drop column if exists last_reminder_sent_at,
  drop column if exists reminder_count,
  drop column if exists stripe_subscription_id,
  drop column if exists stripe_customer_id,
  drop column if exists paypal_subscription_id,
  drop column if exists subscription_cancel_at_period_end,
  drop column if exists statement_of_interest,
  drop column if exists interests,
  drop column if exists how_did_you_hear,
  drop column if exists is_copa_member,
  drop column if exists join_copa_flight_32,
  drop column if exists copa_membership_number,
  drop column if exists pilot_license_type,
  drop column if exists aircraft_type,
  drop column if exists call_sign,
  drop column if exists how_often_fly_from_ytz,
  drop column if exists is_student_pilot,
  drop column if exists flight_school,
  drop column if exists instructor_name,
  drop column if exists custom_data;

alter table public.user_profiles
  drop constraint if exists user_profiles_user_id_unique;

alter table public.user_profiles
  add constraint user_profiles_user_id_unique unique (user_id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can update all profiles" on public.user_profiles;
create policy "Admins can update all profiles"
  on public.user_profiles for update
  using (
    exists (
      select 1
      from public.org_memberships
      where user_id = auth.uid()
        and role = 'admin'
    )
  );

drop policy if exists "Service role can insert profiles" on public.user_profiles;
create policy "Service role can insert profiles"
  on public.user_profiles for insert
  with check (auth.role() = 'service_role');
