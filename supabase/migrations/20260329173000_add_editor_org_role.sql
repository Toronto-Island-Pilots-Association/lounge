ALTER TABLE public.org_memberships
  DROP CONSTRAINT IF EXISTS org_memberships_role_check;

ALTER TABLE public.org_memberships
  ADD CONSTRAINT org_memberships_role_check
  CHECK (role IN ('member', 'editor', 'admin'));

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.user_id = is_admin.user_id AND om.role IN ('admin', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE user_id = p_user_id AND org_id = p_org_id AND role IN ('admin', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages" ON public.pages
  FOR ALL
  USING (
    org_id IN (
      SELECT m.org_id FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT m.org_id FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'editor')
    )
  );
