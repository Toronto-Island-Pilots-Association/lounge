-- Custom field values submitted during signup (admin-configurable fields)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}';
