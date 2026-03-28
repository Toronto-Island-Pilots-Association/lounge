import { POST } from '@/app/api/platform/stripe/webhook/route'

jest.mock('@sentry/nextjs', () => ({
  metrics: { count: jest.fn() },
}))

jest.mock('@/lib/stripe', () => ({
  getPlatformStripeInstance: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/platform-stripe-onboarding', () => ({
  syncOrgStripeByConnectedAccountId: jest.fn().mockResolvedValue(undefined),
}))

describe('/api/platform/stripe/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = 'whsec_platform_test'
  })

  it('updates organizations.plan on checkout.session.completed', async () => {
    const { getPlatformStripeInstance } = require('@/lib/stripe')
    const { createServiceRoleClient } = require('@/lib/supabase/server')

    const orgId = 'org-1'
    const subscriptionId = 'sub_1'
    const planKey = 'community'

    const stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {
            object: {
              subscription: subscriptionId,
              customer: 'cus_1',
              metadata: { orgId, planKey },
            },
          },
        }),
      },
    }

    getPlatformStripeInstance.mockReturnValue(stripe)

    const updatePayload = jest.fn()
    const supabase = {
      from: jest.fn(() => ({
        update: (payload: any) => {
          updatePayload(payload)
          return {
            eq: jest.fn().mockResolvedValue({}),
          }
        },
      })),
    }
    createServiceRoleClient.mockReturnValue(supabase)

    const request = new Request('http://example.com/api/platform/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_test' },
      body: 'raw-body',
    })

    const res = await POST(request as any)
    expect(res.status).toBe(200)

    expect(updatePayload).toHaveBeenCalledWith({
      stripe_subscription_id: subscriptionId,
      plan: planKey,
    })
  })

  it('syncs Connect capabilities on account.updated', async () => {
    const { getPlatformStripeInstance } = require('@/lib/stripe')
    const { syncOrgStripeByConnectedAccountId } = require('@/lib/platform-stripe-onboarding')

    const stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'account.updated',
          data: {
            object: { id: 'acct_test_1' },
          },
        }),
      },
    }
    getPlatformStripeInstance.mockReturnValue(stripe)

    const request = new Request('http://example.com/api/platform/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_test' },
      body: 'raw-body',
    })

    const res = await POST(request as any)
    expect(res.status).toBe(200)
    expect(syncOrgStripeByConnectedAccountId).toHaveBeenCalledWith('acct_test_1')
  })
})

