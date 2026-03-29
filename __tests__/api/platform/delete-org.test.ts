import { DELETE } from '@/app/api/platform/orgs/[orgId]/route'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  getPlatformStripeInstance: jest.fn(),
}))

describe('/api/platform/orgs/[orgId] DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_PLATFORM_SECRET_KEY = 'sk_platform_test'
  })

  it('deletes the organization row, relies on DB cascade, and cleans up external resources', async () => {
    const { createClient, createServiceRoleClient } = require('@/lib/supabase/server')
    const { getPlatformStripeInstance } = require('@/lib/stripe')

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })

    const deleteOrgEq = jest.fn().mockResolvedValue({ error: null })
    const removeBranding = jest.fn().mockResolvedValue({ error: null })

    const db = {
      from: jest.fn((table: string) => {
        if (table === 'org_memberships') {
          let selected = ''
          const q: any = {
            select: jest.fn((columns: string) => {
              selected = columns
              return q
            }),
            eq: jest.fn(() => q),
            maybeSingle: jest.fn().mockImplementation(() => {
              if (selected === 'role') return Promise.resolve({ data: { role: 'admin' } })
              return Promise.resolve({ data: null })
            }),
            not: jest.fn().mockResolvedValue({
              data: [
                { stripe_subscription_id: 'sub_member_1' },
                { stripe_subscription_id: 'sub_member_2' },
              ],
              error: null,
            }),
          }
          return q
        }

        if (table === 'organizations') {
          const q: any = {
            select: jest.fn(() => q),
            eq: jest.fn(() => q),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'org-1',
                stripe_subscription_id: 'sub_org_1',
                logo_url: 'https://example.supabase.co/storage/v1/object/public/org-branding/org-1/logo.png',
                favicon_url: 'https://example.supabase.co/storage/v1/object/public/org-branding/org-1/favicon.ico',
              },
            }),
            delete: jest.fn(() => ({
              eq: deleteOrgEq,
            })),
          }
          return q
        }

        throw new Error(`Unexpected table ${table}`)
      }),
      storage: {
        from: jest.fn(() => ({
          remove: removeBranding,
        })),
      },
    }

    createServiceRoleClient.mockReturnValue(db)

    const stripe = {
      subscriptions: {
        cancel: jest.fn().mockResolvedValue({}),
      },
    }
    getPlatformStripeInstance.mockReturnValue(stripe)

    const request = new Request('http://example.com/api/platform/orgs/org-1', {
      method: 'DELETE',
    })

    const res = await DELETE(request as any, { params: Promise.resolve({ orgId: 'org-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)

    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(3)
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_org_1')
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_member_1')
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_member_2')

    expect(removeBranding).toHaveBeenCalledWith(['org-1/logo.png', 'org-1/favicon.ico'])
    expect(deleteOrgEq).toHaveBeenCalledWith('id', 'org-1')

    const calledTables = db.from.mock.calls.map((args: [string]) => args[0])
    expect(calledTables).toEqual(['org_memberships', 'organizations', 'org_memberships', 'organizations'])
    expect(calledTables).not.toContain('reactions')
    expect(calledTables).not.toContain('comments')
    expect(calledTables).not.toContain('threads')
  })
})
