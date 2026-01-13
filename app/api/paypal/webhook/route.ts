import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const eventType = body.event_type

    // Handle PayPal webhook events
    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED' || eventType === 'BILLING.SUBSCRIPTION.EXPIRED') {
      const subscriptionId = body.resource?.id

      if (subscriptionId) {
        const supabase = await createClient()

        // Downgrade membership to free
        await supabase
          .from('user_profiles')
          .update({
            membership_level: 'Regular',
            paypal_subscription_id: null,
            membership_expires_at: null,
          })
          .eq('paypal_subscription_id', subscriptionId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

