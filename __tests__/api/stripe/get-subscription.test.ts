import { GET } from '@/app/api/stripe/get-subscription/route'

jest.mock('@/lib/auth', () => ({
  requireAuthIncludingPending: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  getPlatformStripeInstance: jest.fn(),
  getStripeInstance: jest.fn(),
  isStripeEnabled: jest.fn(),
}))

jest.mock('@/lib/subscription-sync', () => ({
  resolveMemberStripeContext: jest.fn(),
  syncSubscriptionStatus: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}))

describe('/api/stripe/get-subscription', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('recovers the subscription from org-scoped payment history when the membership row was cleared', async () => {
    const { requireAuthIncludingPending } = require('@/lib/auth')
    const { isStripeEnabled } = require('@/lib/stripe')
    const { resolveMemberStripeContext, syncSubscriptionStatus } = require('@/lib/subscription-sync')
    const { createServiceRoleClient } = require('@/lib/supabase/server')

    isStripeEnabled.mockReturnValue(true)
    requireAuthIncludingPending.mockResolvedValue({
      id: 'user-1',
      profile: {
        org_id: 'org-1',
        status: 'approved',
        stripe_subscription_id: null,
      },
    })

    const paymentsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { stripe_subscription_id: 'sub_recovered' },
      }),
    }

    createServiceRoleClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'payments') return paymentsQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const stripe = {
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_recovered',
          status: 'active',
          cancel_at_period_end: false,
          canceled_at: null,
          items: {
            data: [
              {
                price: {
                  unit_amount: 4500,
                  currency: 'cad',
                },
              },
            ],
          },
          current_period_start: 1767225600,
          current_period_end: 1798761600,
        }),
      },
    }

    resolveMemberStripeContext.mockResolvedValue({ stripe, requestOptions: { stripeAccount: 'acct_1' } })
    syncSubscriptionStatus.mockResolvedValue({
      status: 'approved',
      membership_expires_at: '2027-01-01T00:00:00.000Z',
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.hasSubscription).toBe(true)
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith(
      'sub_recovered',
      expect.objectContaining({
        expand: ['items.data.price'],
        stripeAccount: 'acct_1',
      }),
    )
    expect(syncSubscriptionStatus).toHaveBeenCalledWith('user-1', 'sub_recovered', 'org-1')
  })
})
