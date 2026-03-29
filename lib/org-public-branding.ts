import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const BRANDING_SETTING_KEYS = ['club_logo_url', 'club_favicon_url', 'club_display_name'] as const

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

export type PublicOrgBranding = {
  name: string
  slug: string
  plan: string | null
  /** Resolved for navbar / membership card */
  logoUrl: string | null
  /** organizations.favicon_url or club_favicon_url only (no logo fallback) */
  explicitFaviconUrl: string | null
  /** Tab icon: explicit favicon, else logo, else null */
  siteIconUrl: string | null
  displayName: string
}

/**
 * Org-facing branding for anonymous + authenticated requests.
 * Uses service role when available so guests still get logo/favicon/display name.
 */
export async function fetchPublicOrgBranding(orgId: string): Promise<PublicOrgBranding> {
  let org: {
    name: string | null
    slug: string | null
    logo_url: string | null
    favicon_url: string | null
    plan: string | null
  } | null = null
  const settingsMap = new Map<string, string>()

  try {
    const db = createServiceRoleClient()
    const [orgRes, settingsRes] = await Promise.all([
      db
        .from('organizations')
        .select('name, slug, logo_url, favicon_url, plan')
        .eq('id', orgId)
        .maybeSingle(),
      db
        .from('settings')
        .select('key, value')
        .eq('org_id', orgId)
        .in('key', [...BRANDING_SETTING_KEYS]),
    ])
    org = orgRes.data
    for (const row of settingsRes.data ?? []) {
      if (row.key && typeof row.value === 'string') settingsMap.set(row.key, row.value)
    }
  } catch {
    const supabase = await createClient()
    const { data } = await supabase
      .from('organizations')
      .select('name, slug, logo_url, favicon_url, plan')
      .eq('id', orgId)
      .maybeSingle()
    org = data
  }

  const s = (key: string) => trimStr(settingsMap.get(key))
  const name = trimStr(org?.name)
  const logoFromOrg = trimStr(org?.logo_url)
  const favFromOrg = trimStr(org?.favicon_url)
  const logoUrl = logoFromOrg || s('club_logo_url') || null
  const explicitFaviconUrl = s('club_favicon_url') || favFromOrg || null
  const siteIconUrl = explicitFaviconUrl || logoUrl || null
  const displayName = s('club_display_name') || name

  return {
    name,
    slug: trimStr(org?.slug),
    plan: org?.plan ?? null,
    logoUrl,
    explicitFaviconUrl,
    siteIconUrl,
    displayName,
  }
}

export function iconMimeTypeForUrl(url: string): string {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.ico')) return 'image/x-icon'
  return 'image/png'
}
