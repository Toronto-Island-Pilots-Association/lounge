-- Grant PostgREST-required permissions on tables created via migration.
-- Tables created through migrations (not the Supabase dashboard) don't get
-- default role grants, causing PGRST205 "table not found in schema cache".

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations      TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_memberships    TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings           TO anon, authenticated, service_role;

-- Sequences (needed for INSERT on tables with serial/uuid defaults)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
