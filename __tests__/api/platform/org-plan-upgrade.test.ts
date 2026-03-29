import { POST } from '@/app/api/platform/orgs/[orgId]/plan/upgrade/route'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  getPlatformStripeInstance: jest.fn(),
}))

jest.mock('@/lib/settings', () => ({
  getPlanPriceMonthly: jest.fn(),
}))

jest.mock('@/lib/org-plan-subscription', () => ({
  buildOrgPlanCheckoutLineItems: jest.fn(),
  syncOrgPlanSubscriptionBilling: jest.fn(),
}))

describe('/api/platform/orgs/[orgId]/plan/upgrade', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_PLATFORM_SECRET_KEY = 'sk_platform_test'
  })

  it('creates a Stripe Checkout subscription when org has no subscription yet', async () => {
    const { createClient, createServiceRoleClient } = require('@/lib/supabase/server')
    const { getPlatformStripeInstance } = require('@/lib/stripe')
    const { getPlanPriceMonthly } = require('@/lib/settings')
    const { buildOrgPlanCheckoutLineItems } = require('@/lib/org-plan-subscription')

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })

    const orgId = 'org-1'
    const orgSelectResult = {
      id: orgId,
      name: 'Org 1',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      plan: 'hobby',
    }

    const db = {
      from: jest.fn((table: string) => {
        // Authorization: user is admin of org
        if (table === 'org_memberships') {
          const q: any = {
            select: jest.fn(() => q),
            eq: jest.fn(() => q),
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'm-1' } }),
          }
          return q
        }

        // Load org record
        if (table === 'organizations') {
          const q: any = {
            select: jest.fn(() => q),
            eq: jest.fn(() => q),
            maybeSingle: jest.fn().mockResolvedValue({ data: orgSelectResult }),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({}),
            })),
          }
          return q
        }

        // Optional contact email from settings
        if (table === 'settings') {
          const settingsRows = [{ key: 'contact_email', value: 'billing@org.test' }]
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: settingsRows }),
              })),
            })),
          }
        }

        return { select: jest.fn(), eq: jest.fn() }
      }),
    }

    createServiceRoleClient.mockReturnValue(db)
    getPlanPriceMonthly.mockResolvedValue(49)
    buildOrgPlanCheckoutLineItems.mockResolvedValue({
      lineItems: [{ price: 'price_1', quantity: 1 }],
    })

    const stripe = {
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'cus_1' }),
      },
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({ url: 'https://stripe.example/checkout/sess_1' }),
        },
      },
    }
    getPlatformStripeInstance.mockReturnValue(stripe)

    const request = new Request('http://example.com/api/platform/orgs/org-1/plan/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'starter' }),
    })

    const res = await POST(request as any, { params: Promise.resolve({ orgId }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.url).toBe('https://stripe.example/checkout/sess_1')

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_1', quantity: 1 }],
        metadata: { orgId, planKey: 'starter' },
        subscription_data: { metadata: { orgId, planKey: 'starter' } },
      })
    )
  })

  it('updates existing subscription in-place when org already has a platform subscription', async () => {
    const { createClient, createServiceRoleClient } = require('@/lib/supabase/server')
    const { getPlatformStripeInstance } = require('@/lib/stripe')
    const { getPlanPriceMonthly } = require('@/lib/settings')
    const { syncOrgPlanSubscriptionBilling } = require('@/lib/org-plan-subscription')

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })

    const orgId = 'org-1'
    const orgSelectResult = {
      id: orgId,
      name: 'Org 1',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_123',
      plan: 'hobby',
    }

    const updateCall = jest.fn().mockResolvedValue({})

    const db = {
      from: jest.fn((table: string) => {
        if (table === 'org_memberships') {
          const q: any = {
            select: jest.fn(() => q),
            eq: jest.fn(() => q),
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'm-1' } }),
          }
          return q
        }

        if (table === 'organizations') {
          const q: any = {
            select: jest.fn(() => q),
            eq: jest.fn(() => q),
            maybeSingle: jest.fn().mockResolvedValue({ data: orgSelectResult }),
            update: jest.fn(() => ({
              eq: jest.fn(() => updateCall()),
            })),
          }
          return q
        }

        return { select: jest.fn(), eq: jest.fn() }
      }),
    }

    createServiceRoleClient.mockReturnValue(db)
    getPlanPriceMonthly.mockResolvedValue(99)
    syncOrgPlanSubscriptionBilling.mockResolvedValue({})

    const stripe = {
      subscriptions: {},
    }
    getPlatformStripeInstance.mockReturnValue(stripe)

    const request = new Request('http://example.com/api/platform/orgs/org-1/plan/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'community' }),
    })

    const res = await POST(request as any, { params: Promise.resolve({ orgId }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)

    expect(syncOrgPlanSubscriptionBilling).toHaveBeenCalledWith(orgId, { planKey: 'community' })

    expect(updateCall).toHaveBeenCalled()
  })
})
