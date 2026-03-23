import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Organization } from '@/types/database'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'

/**
 * Resolve an organization from a hostname.
 * Checks custom_domain first, then *.clublounge.app subdomain.
 * Uses the service role client so it works in middleware (edge) and server contexts.
 */
export async function getOrgByHostname(hostname: string): Promise<Organization | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const supabase = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Strip port (e.g. localhost:3000 → localhost)
  const host = hostname.split(':')[0]

  // 1. Exact custom domain match (e.g. lounge.tipa.ca)
  const { data: byDomain } = await supabase
    .from('organizations')
    .select('*')
    .eq('custom_domain', host)
    .maybeSingle()

  if (byDomain) return byDomain as Organization

  // 2. Subdomain of ROOT_DOMAIN (e.g. tipa.clublounge.app)
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = host.slice(0, -(ROOT_DOMAIN.length + 1))
    const { data: bySub } = await supabase
      .from('organizations')
      .select('*')
      .eq('subdomain', subdomain)
      .maybeSingle()

    if (bySub) return bySub as Organization
  }

  return null
}
