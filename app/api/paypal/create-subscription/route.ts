import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendMembershipUpgradeEmail } from '@/lib/resend'
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

async function verifyPayPalSubscription(subscriptionId: string, accessToken: string) {
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Subscription ${subscriptionId} not found in PayPal`)
    }
    const error = await response.json().catch(() => ({ message: 'Failed to verify subscription' }))
    throw new Error(error.message || 'Failed to verify subscription with PayPal')
  }

  const subscription = await response.json()
  
  // Check subscription status
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'APPROVAL_PENDING') {
    throw new Error(`Subscription status is ${subscription.status}. Only ACTIVE or APPROVAL_PENDING subscriptions can be processed.`)
  }

  return subscription
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { subscriptionId, planId } = await request.json()

    if (!subscriptionId || !planId) {
      return NextResponse.json(
        { error: 'Subscription ID and Plan ID are required' },
        { status: 400 }
      )
    }

    // Validate subscription ID format (PayPal subscription IDs typically start with 'I-')
    if (!subscriptionId.startsWith('I-') && !subscriptionId.startsWith('P-')) {
      console.warn('Unexpected subscription ID format:', subscriptionId)
    }

    // Verify subscription with PayPal before updating database
    let subscription
    try {
      const accessToken = await getPayPalAccessToken()
      subscription = await verifyPayPalSubscription(subscriptionId, accessToken)
      console.log('PayPal subscription verified:', {
        subscriptionId,
        status: subscription.status,
        planId: subscription.plan_id,
        startTime: subscription.start_time
      })
    } catch (verifyError: any) {
      console.error('PayPal subscription verification failed:', verifyError)
      return NextResponse.json(
        { 
          error: 'Subscription verification failed',
          details: verifyError.message || 'Could not verify subscription with PayPal. Please try again or contact support.'
        },
        { status: 400 }
      )
    }

    // Verify plan ID matches
    if (subscription.plan_id !== planId) {
      console.warn('Plan ID mismatch:', {
        expected: planId,
        actual: subscription.plan_id
      })
      // This is a warning, not an error - the subscription is valid
    }

    const supabase = await createClient()

    // Calculate expiration date based on subscription billing cycle
    // For annual subscriptions, add 1 year from now
    // If subscription has a billing_info.next_billing_time, use that
    const expiresAt = new Date()
    if (subscription.billing_info?.next_billing_time) {
      // Use the next billing time as expiration (for annual, this is 1 year from start)
      expiresAt.setTime(new Date(subscription.billing_info.next_billing_time).getTime())
    } else {
      // Fallback: add 1 year from now
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    }

    // Check if user already has an active subscription
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('paypal_subscription_id, membership_level')
      .eq('id', user.id)
      .single()

    if (existingProfile?.paypal_subscription_id && existingProfile.paypal_subscription_id !== subscriptionId) {
      console.warn('User already has a different subscription:', {
        userId: user.id,
        existingSubscription: existingProfile.paypal_subscription_id,
        newSubscription: subscriptionId
      })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        membership_level: 'cadet',
        paypal_subscription_id: subscriptionId,
        membership_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update membership',
          details: error.message 
        },
        { status: 400 }
      )
    }

    // Send upgrade email
    try {
      await sendMembershipUpgradeEmail(
        user.profile.email,
        user.profile.full_name || 'Member'
      )
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('Failed to send membership upgrade email:', emailError)
    }

    return NextResponse.json({
      message: 'Membership upgraded successfully',
      subscription: {
        id: subscriptionId,
        status: subscription.status,
        expiresAt: expiresAt.toISOString(),
      }
    })
  } catch (error: any) {
    console.error('PayPal subscription error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred',
        details: error.details || 'Please try again or contact support if the issue persists.'
      },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

