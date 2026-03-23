import { POST } from '@/app/api/stripe/webhook/route'

jest.mock('@sentry/nextjs', () => ({
  metrics: { count: jest.fn() },
}))

jest.mock('@/lib/stripe', () => ({
  getStripeInstance: jest.fn(),
  isStripeEnabled: jest.fn(),
}))

jest.mock('@/lib/subscription-sync', () => ({
  syncSubscriptionBySubscriptionId: jest.fn(),
  syncSubscriptionStatus: jest.fn(),
}))

jest.mock('@/lib/resend', () => ({
  sendSubscriptionConfirmationEmail: jest.fn(),
}))

jest.mock('@/lib/settings', () => ({
  getMembershipFeeForLevel: jest.fn(),
  getMembershipExpiresAtFromSubscription: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  requireAuthIncludingPending: jest.fn(),
}))

describe('Stripe webhook org scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('scopes org_memberships updates by orgId metadata', async () => {
    const { getStripeInstance, isStripeEnabled } = require('@/lib/stripe')
    const { syncSubscriptionStatus } = require('@/lib/subscription-sync')
    const { getMembershipFeeForLevel, getMembershipExpiresAtFromSubscription } = require('@/lib/settings')
    const { sendSubscriptionConfirmationEmail } = require('@/lib/resend')
    const { createServiceRoleClient } = require('@/lib/supabase/server')

    isStripeEnabled.mockReturnValue(true)
    syncSubscriptionStatus.mockResolvedValue(true)
    sendSubscriptionConfirmationEmail.mockResolvedValue(undefined)
    getMembershipFeeForLevel.mockResolvedValue(45)
    getMembershipExpiresAtFromSubscription.mockReturnValue('2026-01-01T00:00:00.000Z')

    const userId = 'user-1'
    const orgId = 'org-1'
    const subscriptionId = 'sub_1'
    const customerId = 'cus_1'
    const invoiceId = 'in_1'

    const stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {
            object: {
              subscription: subscriptionId,
              customer: customerId,
              metadata: { userId, orgId },
            },
          },
        }),
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: subscriptionId,
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
          current_period_start: Math.floor(Date.now() / 1000),
          latest_invoice: invoiceId,
          cancel_at_period_end: false,
        }),
      },
      invoices: {
        retrieve: jest.fn().mockResolvedValue({
          id: invoiceId,
          amount_paid: 4500,
          payment_intent: 'pi_1',
        }),
      },
    }

    getStripeInstance.mockReturnValue(stripe)

    const orgMembershipSelectChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { membership_level: 'Full' } }),
    }

    const orgMembershipUpdateChain: any = {
      eq: jest.fn().mockReturnThis(),
      then: (resolve: any) => resolve({}),
    }

    const orgMembershipFrom = {
      select: jest.fn(() => orgMembershipSelectChain),
      update: jest.fn(() => orgMembershipUpdateChain),
    }

    const paymentInsert = jest.fn().mockResolvedValue({})

    const paymentsFrom = {
      insert: paymentInsert,
    }

    const userProfilesSingleChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { email: 'a@b.com', full_name: 'Alice' } }),
    }

    const userProfilesFrom = {
      select: jest.fn(() => userProfilesSingleChain),
    }

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'org_memberships') return orgMembershipFrom
        if (table === 'payments') return paymentsFrom
        if (table === 'user_profiles') return userProfilesFrom
        return { insert: jest.fn(), update: jest.fn(), select: jest.fn() }
      }),
    }

    createServiceRoleClient.mockReturnValue(mockSupabase)

    const request = new Request('http://example.com/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_test' },
      body: 'raw-body',
    })

    const res = await POST(request as any)
    expect(res.status).toBe(200)

    // Verify that org_id filtering was applied to both membership select and update.
    expect(orgMembershipSelectChain.eq).toHaveBeenCalledWith('org_id', orgId)
    expect(orgMembershipUpdateChain.eq).toHaveBeenCalledWith('org_id', orgId)

    // Verify that payment row includes org_id.
    expect(paymentInsert).toHaveBeenCalledWith(expect.objectContaining({ org_id: orgId }))

    expect(syncSubscriptionStatus).toHaveBeenCalledWith(userId, subscriptionId, orgId)
  })
})

