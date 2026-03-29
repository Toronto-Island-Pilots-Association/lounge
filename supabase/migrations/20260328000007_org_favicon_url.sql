-- Optional per-org favicon (browser tab). Falls back to logo_url when unset.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;
