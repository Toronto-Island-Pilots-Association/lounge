import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import PublicOrgHome from '@/components/PublicOrgHome'
import { getCurrentUserIncludingPending, isOrgPublic } from '@/lib/auth'
import { fetchPublicOrgBranding } from '@/lib/org-public-branding'
import { getOrgIdentity } from '@/lib/settings'
import { createServiceRoleClient } from '@/lib/supabase/server'

export default async function Home() {
  const h = await headers()
  const orgId = h.get('x-org-id')
  if (!orgId) {
    redirect('/login')
  }

  const [user, orgPublic] = await Promise.all([
    getCurrentUserIncludingPending(),
    isOrgPublic(),
  ])

  if (user) {
    redirect('/discussions')
  }

  if (!orgPublic) {
    redirect('/login')
  }

  const [branding, identity, pagesResult] = await Promise.all([
    fetchPublicOrgBranding(orgId),
    getOrgIdentity(orgId),
    createServiceRoleClient()
      .from('pages')
      .select('id, title, slug, content')
      .eq('org_id', orgId)
      .eq('published', true)
      .order('created_at', { ascending: false }),
  ])

  return (
    <PublicOrgHome
      orgId={orgId}
      orgName={branding.name}
      displayName={branding.displayName || branding.name}
      description={identity.description}
      logoUrl={branding.logoUrl}
      contactEmail={identity.contactEmail}
      websiteUrl={identity.websiteUrl}
      feedbackUrl={identity.feedbackUrl}
      pages={pagesResult.data ?? []}
    />
  )
}
