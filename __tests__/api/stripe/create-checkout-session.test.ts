import { POST } from '@/app/api/stripe/create-checkout-session/route'

jest.mock('@/lib/auth', () => ({
  requireAuthIncludingPending: jest.fn(),
}))

jest.mock('@/lib/org', () => ({
  getOrgByHostname: jest.fn(),
}))

jest.mock('@/lib/settings', () => ({
  getMembershipFeeForLevel: jest.fn(),
  getTrialEndDateAsync: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  getPlatformStripeInstance: jest.fn(),
  getStripeInstance: jest.fn(),
  isStripeEnabled: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}))

describe('/api/stripe/create-checkout-session', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses the org name for the checkout product (and connect account when configured)', async () => {
    const { requireAuthIncludingPending } = require('@/lib/auth')
    const { getMembershipFeeForLevel, getTrialEndDateAsync } = require('@/lib/settings')
    const { getPlatformStripeInstance, isStripeEnabled } = require('@/lib/stripe')
    const { createServiceRoleClient, createClient } = require('@/lib/supabase/server')
    const { getOrgByHostname } = require('@/lib/org')

    isStripeEnabled.mockReturnValue(true)

    getMembershipFeeForLevel.mockResolvedValue(45)
    getTrialEndDateAsync.mockResolvedValue(new Date(Date.now() - 60_000)) // no trial, easier assertions

    requireAuthIncludingPending.mockResolvedValue({
      id: 'user-1',
      profile: {
        membership_level: 'Full',
        created_at: new Date().toISOString(),
        email: 'hakimelek@gmail.com',
        stripe_customer_id: 'cus_123',
        full_name: 'Hakime Lek',
        first_name: null,
        last_name: null,
        postal_zip_code: null,
        country: null,
        street: null,
        city: null,
        province_state: null,
      },
    } as any)

    let capturedSessionParams: any = null
    const stripe = {
      customers: {
        update: jest.fn().mockResolvedValue({ id: 'cus_123' }),
        create: jest.fn(),
      },
      prices: {
        create: jest.fn().mockResolvedValue({ id: 'price_1' }),
      },
      checkout: {
        sessions: {
          create: jest.fn().mockImplementation((params: any) => {
            capturedSessionParams = params
            return Promise.resolve({
            id: 'sess_1',
            url: 'https://stripe.test/checkout/sess_1',
            })
          }),
        },
      },
    }
    getPlatformStripeInstance.mockReturnValue(stripe)

    createClient.mockResolvedValue({})

    const mockDb = {
      from: jest.fn(() => {
        const query = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              stripe_account_id: 'acct_rowing',
              stripe_charges_enabled: true,
              name: 'Toronto Rowing Club',
            },
          }),
        }
        return query
      }),
    }
    createServiceRoleClient.mockReturnValue(mockDb)

    getOrgByHostname.mockResolvedValue({
      id: 'org-rowing',
      name: 'Toronto Rowing Club',
    })

    const request = new Request('http://tra.clublounge.local/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: 'tra.clublounge.local:3000',
        'x-org-id': 'org-rowing',
      },
    })

    const res = await POST(request as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.url).toBe('https://stripe.test/checkout/sess_1')

    expect(stripe.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        product_data: {
          name: 'Toronto Rowing Club Annual Membership (Full)',
        },
      }),
      { stripeAccount: 'acct_rowing' },
    )

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.any(Object),
      { stripeAccount: 'acct_rowing' },
    )

    expect(capturedSessionParams).toBeTruthy()
    expect(capturedSessionParams.payment_intent_data).toBeUndefined()
    expect(capturedSessionParams.subscription_data).toEqual(
      expect.objectContaining({
        application_fee_percent: 2,
      }),
    )
  })
})

