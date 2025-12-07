import { requireAuth } from '@/lib/auth'
import { getPayPalPlanId } from '@/lib/paypal'
import { NextResponse } from 'next/server'

// PayPal API base URLs
const PAYPAL_BASE_URL = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get access token' }))
    throw new Error(error.message || 'Failed to authenticate with PayPal')
  }

  const data = await response.json()
  return data.access_token
}

async function validatePayPalPlan(planId: string, accessToken: string) {
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans/${planId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return { valid: false, error: 'Plan not found', details: `Plan ID ${planId} does not exist in PayPal` }
    }
    const error = await response.json().catch(() => ({ message: 'Failed to validate plan' }))
    return { 
      valid: false, 
      error: error.message || 'Failed to validate plan',
      details: `PayPal API returned status ${response.status}`
    }
  }

  const plan = await response.json()

  // Check if plan is active
  if (plan.status !== 'ACTIVE') {
    return { 
      valid: false, 
      error: 'Plan is not active', 
      details: `Plan status is ${plan.status}. Only ACTIVE plans can be used for subscriptions.`,
      plan
    }
  }

  // Check currency - should be CAD
  const currency = plan.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.currency_code ||
                   plan.billing_cycles?.[0]?.pricing_scheme?.tiered_pricing?.tiers?.[0]?.amount?.currency_code

  if (currency && currency !== 'CAD') {
    return { 
      valid: false, 
      error: 'Currency mismatch', 
      details: `Plan currency is ${currency}, but application expects CAD. Please ensure your PayPal plan uses CAD currency.`,
      plan
    }
  }

  return { 
    valid: true, 
    plan,
    currency: currency || 'CAD' // Default to CAD if not specified
  }
}

export async function GET(request: Request) {
  try {
    await requireAuth()

    // Get plan ID from environment or query params
    const { searchParams } = new URL(request.url)
    const planIdParam = searchParams.get('planId')
    const planId = planIdParam || getPayPalPlanId()

    if (!planId) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Plan ID not found',
          details: 'PayPal plan ID is not configured. Please set PAYPAL_PLAN_ID environment variable.'
        },
        { status: 400 }
      )
    }

    // Check if PayPal is configured
    if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'PayPal not configured',
          details: 'PayPal credentials are not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.'
        },
        { status: 400 }
      )
    }

    // Get access token
    const accessToken = await getPayPalAccessToken()

    // Validate the plan
    const validation = await validatePayPalPlan(planId, accessToken)

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error,
          details: validation.details,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      planId,
      currency: validation.currency,
      planName: validation.plan?.name,
      status: validation.plan?.status,
    })
  } catch (error: any) {
    console.error('PayPal plan validation error:', error)
    return NextResponse.json(
      { 
        valid: false,
        error: error.message || 'Failed to validate PayPal plan',
        details: 'An unexpected error occurred while validating the plan. Check server logs for details.'
      },
      { status: 500 }
    )
  }
}

