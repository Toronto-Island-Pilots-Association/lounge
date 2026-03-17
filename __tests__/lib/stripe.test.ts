describe('lib/stripe', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('isStripeEnabled', () => {
    it('returns false when keys are missing', () => {
      delete process.env.STRIPE_SECRET_KEY
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      const { isStripeEnabled } = require('@/lib/stripe')
      expect(isStripeEnabled()).toBe(false)
    })

    it('returns false when keys contain placeholder text', () => {
      process.env.STRIPE_SECRET_KEY = 'your_stripe_secret_key'
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_real'
      const { isStripeEnabled } = require('@/lib/stripe')
      expect(isStripeEnabled()).toBe(false)
    })

    it('returns true when real keys are set', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_realkey123'
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_realkey123'
      const { isStripeEnabled } = require('@/lib/stripe')
      expect(isStripeEnabled()).toBe(true)
    })
  })

  describe('isStripeDemoMode', () => {
    it('returns true when NEXT_PUBLIC_STRIPE_DEMO_MODE is "true"', () => {
      process.env.NEXT_PUBLIC_STRIPE_DEMO_MODE = 'true'
      process.env.STRIPE_SECRET_KEY = 'sk_test_real'
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_real'
      const { isStripeDemoMode } = require('@/lib/stripe')
      expect(isStripeDemoMode()).toBe(true)
    })

    it('returns true when Stripe is not enabled', () => {
      delete process.env.STRIPE_SECRET_KEY
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      delete process.env.NEXT_PUBLIC_STRIPE_DEMO_MODE
      const { isStripeDemoMode } = require('@/lib/stripe')
      expect(isStripeDemoMode()).toBe(true)
    })

    it('returns false when Stripe is enabled and demo mode is not set', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_real'
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_real'
      delete process.env.NEXT_PUBLIC_STRIPE_DEMO_MODE
      const { isStripeDemoMode } = require('@/lib/stripe')
      expect(isStripeDemoMode()).toBe(false)
    })
  })

  describe('getStripeSecretKey', () => {
    it('returns the secret key', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_abc'
      const { getStripeSecretKey } = require('@/lib/stripe')
      expect(getStripeSecretKey()).toBe('sk_test_abc')
    })

    it('throws when key is not set', () => {
      delete process.env.STRIPE_SECRET_KEY
      const { getStripeSecretKey } = require('@/lib/stripe')
      expect(() => getStripeSecretKey()).toThrow('STRIPE_SECRET_KEY is not configured')
    })
  })

  describe('getStripePublishableKey', () => {
    it('returns the publishable key', () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_xyz'
      const { getStripePublishableKey } = require('@/lib/stripe')
      expect(getStripePublishableKey()).toBe('pk_test_xyz')
    })

    it('returns null when not set', () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      const { getStripePublishableKey } = require('@/lib/stripe')
      expect(getStripePublishableKey()).toBeNull()
    })
  })

  describe('getStripePriceId', () => {
    it('returns price id when set', () => {
      process.env.STRIPE_PRICE_ID = 'price_abc123'
      const { getStripePriceId } = require('@/lib/stripe')
      expect(getStripePriceId()).toBe('price_abc123')
    })

    it('returns null when not set', () => {
      delete process.env.STRIPE_PRICE_ID
      const { getStripePriceId } = require('@/lib/stripe')
      expect(getStripePriceId()).toBeNull()
    })
  })
})
