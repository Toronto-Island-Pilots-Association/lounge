/**
 * Vercel Domains API helpers.
 * Used to programmatically register custom domains and subdomains for new orgs.
 *
 * Required env vars:
 *   VERCEL_API_TOKEN    — from Vercel account settings → Tokens
 *   VERCEL_PROJECT_ID   — from Vercel project settings → General
 *   VERCEL_TEAM_ID      — optional, required for team projects
 */

const VERCEL_API = 'https://api.vercel.com'

function headers() {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) throw new Error('VERCEL_API_TOKEN is not configured')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function projectUrl(path: string) {
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!projectId) throw new Error('VERCEL_PROJECT_ID is not configured')
  const teamId = process.env.VERCEL_TEAM_ID
  const base = `${VERCEL_API}/v10/projects/${projectId}${path}`
  return teamId ? `${base}?teamId=${teamId}` : base
}

export interface VercelDomainResult {
  success: boolean
  domain?: string
  error?: string
  alreadyExists?: boolean
}

/**
 * Register a domain on the Vercel project.
 * Works for both subdomains (tipa.clublounge.app) and custom domains (lounge.tipa.ca).
 */
export async function addDomainToProject(domain: string): Promise<VercelDomainResult> {
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    // Silently skip in local dev
    console.warn('Vercel domain registration skipped: VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set')
    return { success: true, domain }
  }

  const res = await fetch(projectUrl('/domains'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: domain }),
  })

  const data = await res.json()

  if (res.ok) return { success: true, domain: data.name }

  // Domain already on this project — not an error
  if (data.error?.code === 'domain_already_in_use') {
    return { success: true, domain, alreadyExists: true }
  }

  return { success: false, error: data.error?.message ?? 'Failed to register domain' }
}

export type DomainVerificationStatus = 'verified' | 'pending' | 'invalid' | 'misconfigured'

export interface DomainVerificationResult {
  status: DomainVerificationStatus
  domain: string
}

/**
 * Check whether a custom domain is correctly pointed at Vercel.
 * Uses the project-scoped domains API which returns per-record verification state.
 */
export async function checkDomainVerification(domain: string): Promise<DomainVerificationResult> {
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    return { status: 'pending', domain }
  }

  const res = await fetch(projectUrl(`/domains/${encodeURIComponent(domain)}`), {
    headers: headers(),
  })

  if (res.status === 404) return { status: 'invalid', domain }

  const data = await res.json()

  if (!res.ok) return { status: 'invalid', domain }

  if (data.verified) return { status: 'verified', domain }

  // `misconfigured` means the domain exists in Vercel but DNS isn't correct yet
  return { status: data.misconfigured ? 'misconfigured' : 'pending', domain }
}

/**
 * Remove a domain from the Vercel project.
 * Call when an org is deleted or changes their custom domain.
 */
export async function removeDomainFromProject(domain: string): Promise<VercelDomainResult> {
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    return { success: true, domain }
  }

  const res = await fetch(projectUrl(`/domains/${domain}`), {
    method: 'DELETE',
    headers: headers(),
  })

  if (res.ok || res.status === 404) return { success: true, domain }

  const data = await res.json()
  return { success: false, error: data.error?.message ?? 'Failed to remove domain' }
}
