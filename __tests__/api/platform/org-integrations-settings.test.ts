import { PATCH } from '@/app/api/platform/orgs/[orgId]/settings/integrations/route'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/org-billing-activation', () => ({
  getOrgBillingActivationStatus: jest.fn().mockResolvedValue({ activated: true, requiresActivation: false }),
}))

jest.mock('@/lib/stripe', () => ({
  getPlatformStripeInstance: jest.fn(),
}))

jest.mock('@/lib/vercel', () => ({
  addDomainToProject: jest.fn().mockResolvedValue({ success: true }),
  checkDomainVerification: jest.fn(),
}))

jest.mock('@/lib/settings', () => ({
  getOrgPlan: jest.fn().mockResolvedValue('growth'),
}))

jest.mock('@/lib/plans', () => ({
  getPlanDef: jest.fn().mockReturnValue({ features: { customDomain: true } }),
}))

jest.mock('@/lib/org', () => ({
  ...jest.requireActual('@/lib/org'),
  validateOrgSlug: jest.fn((slug: string) => {
    if (!slug) return { valid: false, error: 'Slug is required' }
    if (!/^[a-z0-9-]+$/.test(slug)) return { valid: false, error: 'Only lowercase letters, numbers, and hyphens allowed' }
    if (slug.length < 2) return { valid: false, error: 'Slug must be at least 2 characters' }
    if (slug.length > 40) return { valid: false, error: 'Slug must be 40 characters or less' }
    if (slug.startsWith('-') || slug.endsWith('-')) return { valid: false, error: 'Slug cannot start or end with a hyphen' }
    if (slug === 'platform' || slug === 'www') return { valid: false, error: `"${slug}" is reserved` }
    return { valid: true }
  }),
}))

describe('/api/platform/orgs/[orgId]/settings/integrations PATCH', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates the subdomain when valid and available', async () => {
    const { createClient, createServiceRoleClient } = require('@/lib/supabase/server')

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })

    const updateEq = jest.fn().mockResolvedValue({ error: null })

    const db = {
      from: jest.fn((table: string) => {
        if (table === 'org_memberships') {
          const q: any = {
            select: jest.fn(() => q),
            eq: jest.fn(() => q),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
          }
          return q
        }

        if (table === 'organizations') {
          let selectColumns = ''
          const q: any = {
            select: jest.fn((columns: string) => {
              selectColumns = columns
              return q
            }),
            eq: jest.fn(() => q),
            neq: jest.fn(() => q),
            maybeSingle: jest.fn().mockImplementation(() => {
              if (selectColumns === 'id') return Promise.resolve({ data: null, error: null })
              return Promise.resolve({ data: null, error: null })
            }),
            update: jest.fn(() => ({
              eq: updateEq,
            })),
            single: jest.fn().mockResolvedValue({
              data: {
                custom_domain: null,
                custom_domain_verified: null,
                subdomain: 'new-lounge',
                stripe_account_id: null,
                stripe_onboarding_complete: false,
                stripe_charges_enabled: false,
                stripe_payouts_enabled: false,
              },
              error: null,
            }),
          }
          return q
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    createServiceRoleClient.mockReturnValue(db)

    const req = new Request('http://example.com/api/platform/orgs/org-1/settings/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain: 'new-lounge' }),
    })

    const res = await PATCH(req as any, { params: Promise.resolve({ orgId: 'org-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.org.subdomain).toBe('new-lounge')
    expect(updateEq).toHaveBeenCalledWith('id', 'org-1')
  })

  it('rejects a taken subdomain', async () => {
    const { createClient, createServiceRoleClient } = require('@/lib/supabase/server')

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })

    const db = {
      from: jest.fn((table: string) => {
        if (table === 'org_memberships') {
          const q: any = {
            select: jest.fn(() => q),
            eq: jest.fn(() => q),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
          }
          return q
        }

        if (table === 'organizations') {
          const q: any = {
            select: jest.fn(() => q),
            eq: jest.fn(() => q),
            neq: jest.fn(() => q),
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'org-2' }, error: null }),
          }
          return q
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    }

    createServiceRoleClient.mockReturnValue(db)

    const req = new Request('http://example.com/api/platform/orgs/org-1/settings/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain: 'taken-name' }),
    })

    const res = await PATCH(req as any, { params: Promise.resolve({ orgId: 'org-1' }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toBe('This subdomain is already taken')
  })
})
