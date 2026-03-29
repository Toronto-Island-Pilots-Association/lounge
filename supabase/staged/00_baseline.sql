-- Baseline queries for the legacy single-tenant lounge-dev database.
-- Run these before any staged migration work and save the output.

select count(*) as user_profiles_count from public.user_profiles;
select count(*) as settings_count from public.settings;
select count(*) as threads_count from public.threads;
select count(*) as comments_count from public.comments;
select count(*) as events_count from public.events;
select count(*) as event_rsvps_count from public.event_rsvps;
select count(*) as resources_count from public.resources;
select count(*) as payments_count from public.payments;

select role, status, count(*) as members
from public.user_profiles
group by 1, 2
order by 1, 2;

select membership_level, count(*) as members
from public.user_profiles
group by 1
order by 2 desc, 1;

select id, email, role, status, membership_level, member_number
from public.user_profiles
order by created_at asc
limit 10;
