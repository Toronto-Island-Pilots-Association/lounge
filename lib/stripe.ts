import Stripe from 'stripe'

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return key
}

export function getStripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null
}

export function isStripeEnabled(): boolean {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  
  return !!(
    secretKey && 
    publishableKey && 
    !secretKey.includes('your_stripe') && 
    !secretKey.includes('placeholder') &&
    !publishableKey.includes('your_stripe') &&
    !publishableKey.includes('placeholder')
  )
}

export function isStripeDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_DEMO_MODE === 'true' || !isStripeEnabled()
}

export function getStripeInstance(): Stripe {
  const secretKey = getStripeSecretKey()
  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia' as any,
  })
}

export function getStripePriceId(): string | null {
  return process.env.STRIPE_PRICE_ID || null
}
