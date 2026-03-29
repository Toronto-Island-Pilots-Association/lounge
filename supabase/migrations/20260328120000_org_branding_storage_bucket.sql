-- Public bucket for org logos and favicons (URLs stored on organizations.logo_url / favicon_url)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('org-branding', 'org-branding', true, 5242880)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Public read org branding" ON storage.objects;
CREATE POLICY "Public read org branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-branding');
