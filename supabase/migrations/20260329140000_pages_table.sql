-- Pages: admin-authored, always-public content pages
-- Used for About, Member Benefits, FAQ, etc. — visible before login/paywall.
-- Available on all plans (pages: true in lib/plans.ts).

CREATE TABLE IF NOT EXISTS pages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  slug         TEXT        NOT NULL,
  content      TEXT,
  image_url    TEXT,
  published    BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

-- Index for slug lookups (public page view fetches by org_id + slug)
CREATE INDEX IF NOT EXISTS pages_org_id_slug_idx ON pages (org_id, slug);
CREATE INDEX IF NOT EXISTS pages_org_id_published_idx ON pages (org_id, published);

-- RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on their own org's pages
CREATE POLICY "Admins can manage pages" ON pages
  FOR ALL
  USING (
    org_id IN (
      SELECT m.org_id FROM org_memberships m
      WHERE m.user_id = auth.uid() AND m.role = 'admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT m.org_id FROM org_memberships m
      WHERE m.user_id = auth.uid() AND m.role = 'admin'
    )
  );

-- updated_at trigger (mirrors other tables)
CREATE OR REPLACE FUNCTION update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_pages_updated_at();
