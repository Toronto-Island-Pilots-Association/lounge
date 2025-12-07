import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getMembershipFee } from '@/lib/settings'
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

async function createPayPalPlan(amount: number, accessToken: string): Promise<string> {
  const productId = await getOrCreateProduct(accessToken)
  const planName = `TIPA Annual Membership - $${amount.toFixed(2)}`
  const planDescription = `Annual membership for Toronto Island Pilots Association`

  // PayPal subscription plan schema - exact format required by PayPal API
  // Based on PayPal REST API v1 billing plans documentation
  const planData = {
    product_id: productId,
    name: planName,
    description: planDescription,
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: {
          interval_unit: 'YEAR',
          interval_count: 1,
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // 0 means infinite/recurring
        pricing_scheme: {
          pricing_model: 'FIXED_PRICE',
          fixed_price: {
            value: amount.toFixed(2),
            currency_code: 'CAD',
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: {
        value: '0',
        currency_code: 'CAD',
      },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
    quantity_supported: false,
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `plan-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(planData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let error: any
    try {
      error = JSON.parse(errorText)
    } catch {
      error = { message: errorText || 'Failed to create plan' }
    }
    
    // Log full error details for debugging
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      error: error,
      requestBody: JSON.stringify(planData, null, 2),
    }
    console.error('PayPal plan creation error details:', errorDetails)
    
    // Extract detailed error message
    const errorMessage = error.details?.[0]?.description || 
                        error.details?.[0]?.issue || 
                        error.message || 
                        `Failed to create PayPal subscription plan: ${response.statusText}`
    
    // Include field location if available
    const fieldLocation = error.details?.[0]?.field || error.details?.[0]?.location
    const fullErrorMessage = fieldLocation 
      ? `${errorMessage} (Field: ${fieldLocation})`
      : errorMessage
    
    throw new Error(fullErrorMessage)
  }

  const data = await response.json()
  return data.id
}

async function getOrCreateProduct(accessToken: string): Promise<string> {
  // Check if product exists in settings
  const supabase = await createClient()
  const { data: productSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'paypal_product_id')
    .single()

  if (productSetting?.value) {
    return productSetting.value
  }

  // Create a new product
  // PayPal requires: name, type, and optionally category
  const productData: any = {
    name: 'TIPA Membership',
    type: 'SERVICE',
  }
  
  // Add optional fields only if they're valid
  const description = 'Toronto Island Pilots Association Membership'
  if (description && description.length <= 127) {
    productData.description = description
  }
  
  // Category is optional but can help with organization
  productData.category = 'MEMBERSHIPS'

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `product-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(productData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let error: any
    try {
      error = JSON.parse(errorText)
    } catch {
      error = { message: errorText || 'Failed to create product' }
    }
    console.error('PayPal product creation error details:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      requestBody: productData,
    })
    throw new Error(
      error.message || 
      error.details?.[0]?.description || 
      `Failed to create PayPal product: ${response.statusText}`
    )
  }

  const data = await response.json()
  const productId = data.id

  // Store product ID in settings
  await supabase
    .from('settings')
    .upsert({
      key: 'paypal_product_id',
      value: productId,
    }, {
      onConflict: 'key'
    })

  return productId
}

export async function GET() {
  try {
    await requireAuth()

    // Priority 1: Check environment variable first
    const envPlanId = getPayPalPlanId()
    if (envPlanId) {
      return NextResponse.json({ planId: envPlanId, source: 'environment' })
    }

    const supabase = await createClient()

    // Priority 2: Check if plan ID exists in database settings
    const { data: planSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'paypal_plan_id')
      .single()

    if (planSetting?.value) {
      return NextResponse.json({ planId: planSetting.value, source: 'database' })
    }

    // Get membership fee
    const membershipFee = await getMembershipFee()

    // Check if PayPal is configured
    if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'PayPal is not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.' },
        { status: 400 }
      )
    }

    // Get access token
    const accessToken = await getPayPalAccessToken()

    // Create subscription plan (this will also create product if needed)
    let planId: string
    try {
      planId = await createPayPalPlan(membershipFee, accessToken)
    } catch (error: any) {
      console.error('Failed to create PayPal plan:', error)
      // If plan creation fails, it might be because product creation failed
      // Try to get more details
      // Return detailed error information
      const errorMessage = error.message || 'Failed to create PayPal subscription plan'
      return NextResponse.json(
        { 
          error: errorMessage,
          details: 'Please check that your PayPal credentials are correct and that you have the necessary permissions in your PayPal account. Check server logs for full error details.',
          troubleshooting: [
            'Verify your PayPal Business account is approved for subscriptions',
            'Check that API credentials have billing/subscription permissions',
            'Ensure you are using the correct environment (sandbox vs production)',
            'Review server console logs for detailed PayPal API error response',
          ],
        },
        { status: 400 }
      )
    }

    // Store plan ID in settings
    await supabase
      .from('settings')
      .upsert({
        key: 'paypal_plan_id',
        value: planId,
      }, {
        onConflict: 'key'
      })

    return NextResponse.json({ planId })
  } catch (error: any) {
    console.error('PayPal get plan error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get PayPal subscription plan' },
      { status: error.message?.includes('not configured') ? 400 : 500 }
    )
  }
}

