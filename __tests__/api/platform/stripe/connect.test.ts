import { POST } from '@/app/api/platform/stripe/connect/route'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  getPlatformStripeInstance: jest.fn(),
}))

describe('/api/platform/stripe/connect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns onboarding URL when the user is an admin of the org', async () => {
    const { createClient, createServiceRoleClient } = require('@/lib/supabase/server')
    const { getPlatformStripeInstance } = require('@/lib/stripe')

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })

    const mockDb = {
      from: jest.fn((table: string) => {
        const query = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
          single: jest.fn(),
        }

        if (table === 'org_memberships') {
          query.maybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null })
        }
        if (table === 'organizations') {
          query.single.mockResolvedValue({
            data: { id: 'org-1', name: 'Org 1', stripe_account_id: null },
            error: null,
          })
        }

        return query
      }),
    }

    createServiceRoleClient.mockReturnValue(mockDb)

    const stripe = {
      accounts: {
        create: jest.fn().mockResolvedValue({ id: 'acct_new' }),
      },
      accountLinks: {
        create: jest.fn().mockResolvedValue({ url: 'https://stripe.example/onboarding' }),
      },
    }
    getPlatformStripeInstance.mockReturnValue(stripe)

    const request = new Request('http://clublounge.local/api/platform/stripe/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-domain-type': 'platform',
        host: 'platform.clublounge.local:3000',
      },
      body: JSON.stringify({ orgId: 'org-1' }),
    })

    const res = await POST(request as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.url).toBe('https://stripe.example/onboarding')
    expect(stripe.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'express' }),
    )
    expect(stripe.accountLinks.create).toHaveBeenCalled()
  })

  it('returns 403 when the user is not an admin of the org', async () => {
    const { createClient, createServiceRoleClient } = require('@/lib/supabase/server')

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })

    const mockDb = {
      from: jest.fn((table: string) => {
        const query = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(),
          single: jest.fn(),
        }

        if (table === 'org_memberships') {
          query.maybeSingle.mockResolvedValue({ data: null, error: null })
        }

        return query
      }),
    }

    createServiceRoleClient.mockReturnValue(mockDb)

    const request = new Request('http://clublounge.local/api/platform/stripe/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-domain-type': 'platform',
      },
      body: JSON.stringify({ orgId: 'org-1' }),
    })

    const res = await POST(request as any)
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})

