-- Add 14-day free trial support to organizations
alter table organizations
  add column if not exists trial_ends_at timestamptz;
