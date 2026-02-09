import { NextResponse } from 'next/server'
import { isStripeEnabled } from '@/lib/stripe'
import { getMembershipFee } from '@/lib/settings'

// Demo mode - returns mock subscription data for testing UI
// This is used as a fallback when Stripe is not configured
export async function GET() {
  // If Stripe is properly configured, don't allow demo mode
  // (unless explicitly enabled via env var)
  const forceDemoMode = process.env.NEXT_PUBLIC_STRIPE_DEMO_MODE === 'true'
  const stripeEnabled = isStripeEnabled()

  if (stripeEnabled && !forceDemoMode) {
    return NextResponse.json(
      { error: 'Stripe is configured. Use the regular subscription endpoint.' },
      { status: 403 }
    )
  }

  // Return mock subscription data
  const now = new Date()
  const nextYear = new Date(now)
  nextYear.setFullYear(nextYear.getFullYear() + 1)

  // Get membership fee for demo
  const membershipFee = await getMembershipFee()

  // For demo, you can toggle between having a subscription or not
  // Default to showing active subscription for demo purposes
  const hasSubscription = true // Set to false to show "no subscription" state

  if (hasSubscription) {
    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        id: 'sub_demo_1234567890',
        status: 'active',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: nextYear.toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        amount: membershipFee,
        currency: 'cad',
      },
      demo: true,
    })
  } else {
    return NextResponse.json({
      hasSubscription: false,
      demo: true,
    })
  }
}
