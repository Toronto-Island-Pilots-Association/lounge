import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getPlanDef, DEFAULT_PLAN } from '@/lib/plans'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'
const IS_DEV = process.env.NODE_ENV === 'development'
const PROTOCOL = IS_DEV ? 'http' : 'https'
const PORT = IS_DEV ? ':3000' : ''

export default async function PoweredByBadge() {
  let ref: string | undefined
  try {
    const h = await headers()
    const orgId = h.get('x-org-id')
    if (!orgId) return null
    const supabase = await createClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('plan, slug')
      .eq('id', orgId)
      .maybeSingle()
    const plan = (org?.plan as string) || DEFAULT_PLAN
    if (getPlanDef(plan).features.hideBranding) return null
    ref = org?.slug ?? undefined
  } catch {
    return null
  }

  const marketingUrl = `${PROTOCOL}://${ROOT_DOMAIN}${PORT}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`

  return (
    <a
      href={marketingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full bg-white border border-gray-200 shadow-sm px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 hover:shadow-md transition-all"
    >
      <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Powered by ClubLounge
    </a>
  )
}
