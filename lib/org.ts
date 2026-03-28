import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Organization } from '@/types/database'

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'

/**
 * Public sales demo org (`demo.${ROOT_DOMAIN}`). Guests here should be sent to
 * platform signup, not `/become-a-member` (which joins this demo club).
 */
export const CLUBLOUNGE_DEMO_ORG_SLUG = 'demo'

/**
 * Absolute URL to create a new organization on ClubLounge.
 * Org subdomains cannot serve `/platform/*` (404) — always use this for cross-domain links.
 */
export function getPlatformSignupAbsoluteUrl(): string {
  const custom = process.env.NEXT_PUBLIC_PLATFORM_SIGNUP_URL?.replace(/\/$/, '')
  if (custom) return custom
  if (process.env.NODE_ENV === 'development') {
    const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    return `${base}/platform/signup`
  }
  return `https://www.${ROOT_DOMAIN}/platform/signup`
}

export function isClubLoungeDemoOrgSlug(slug: string | null | undefined): boolean {
  return slug === CLUBLOUNGE_DEMO_ORG_SLUG
}

/** Subdomains reserved for platform use — cannot be registered as org slugs. */
export const RESERVED_SUBDOMAINS = new Set([
  'platform',
  'www',
  'api',
  'mail',
  'support',
  'help',
  'status',
  'billing',
  'admin',
  'dashboard',
  'static',
  'assets',
  'cdn',
])

export type DomainType = 'marketing' | 'org'

/**
 * Classify a hostname into one of two domain types:
 *   marketing → clublounge.app (root domain, serves marketing + platform routes at /platform/*)
 *   org       → anything else (custom domain or non-reserved subdomain)
 */
export function getDomainType(hostname: string): DomainType {
  const host = hostname.split(':')[0]

  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return 'marketing'
  // In local dev, bare localhost is treated as the marketing/platform domain
  if (host === 'localhost' || host === '127.0.0.1') return 'marketing'
  return 'org'
}

/**
 * Resolve an organization from a hostname.
 * Returns null for reserved/platform/marketing hostnames.
 */
export async function getOrgByHostname(hostname: string): Promise<Organization | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const host = hostname.split(':')[0]

  // Don't look up orgs for platform or marketing domains
  if (getDomainType(host) !== 'org') return null

  const supabase = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

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
    if (RESERVED_SUBDOMAINS.has(subdomain)) return null

    const { data: bySub } = await supabase
      .from('organizations')
      .select('*')
      .eq('subdomain', subdomain)
      .maybeSingle()

    if (bySub) return bySub as Organization
  }

  return null
}

/** Convert a display name into a URL-safe slug. */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Build the public URL for an org, using custom domain if set (prod only). */
export function buildOrgUrl(org: { subdomain: string; custom_domain?: string | null }): string {
  const isDev = process.env.NODE_ENV === 'development'
  const protocol = isDev ? 'http' : 'https'
  const port = isDev ? ':3000' : ''
  // In dev, always use the subdomain so custom domains (which aren't proxied locally) don't break routing
  if (!isDev && org.custom_domain) return `https://${org.custom_domain}`
  return `${protocol}://${org.subdomain}.${ROOT_DOMAIN}${port}`
}

/** Validate a proposed org slug: lowercase alphanumeric + hyphens, not reserved. */
export function validateOrgSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) return { valid: false, error: 'Slug is required' }
  if (!/^[a-z0-9-]+$/.test(slug)) return { valid: false, error: 'Only lowercase letters, numbers, and hyphens allowed' }
  if (slug.length < 2) return { valid: false, error: 'Slug must be at least 2 characters' }
  if (slug.length > 40) return { valid: false, error: 'Slug must be 40 characters or less' }
  if (slug.startsWith('-') || slug.endsWith('-')) return { valid: false, error: 'Slug cannot start or end with a hyphen' }
  if (RESERVED_SUBDOMAINS.has(slug)) return { valid: false, error: `"${slug}" is reserved` }
  return { valid: true }
}
