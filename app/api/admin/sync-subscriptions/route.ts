import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { syncSubscriptionByUserId, syncSubscriptionBySubscriptionId } from '@/lib/subscription-sync'
import { NextResponse } from 'next/server'

/**
 * Admin endpoint to sync subscription status
 * 
 * POST /api/admin/sync-subscriptions
 * Body: { userId?: string, subscriptionId?: string, all?: boolean }
 * 
 * - If userId is provided: sync that specific user
 * - If subscriptionId is provided: sync that specific subscription
 * - If all is true: sync all users with Stripe subscriptions
 */
export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { userId, subscriptionId, all } = body

    if (all) {
      // Sync all users with Stripe subscriptions
      const supabase = await createClient()
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('id, stripe_subscription_id')
        .not('stripe_subscription_id', 'is', null)

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch users with subscriptions' },
          { status: 500 }
        )
      }

      const results = await Promise.allSettled(
        (profiles || []).map(profile =>
          syncSubscriptionBySubscriptionId(profile.stripe_subscription_id!)
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length

      return NextResponse.json({
        message: `Synced ${successful} subscriptions${failed > 0 ? `, ${failed} failed` : ''}`,
        successful,
        failed,
        total: profiles?.length || 0,
      })
    }

    if (subscriptionId) {
      const success = await syncSubscriptionBySubscriptionId(subscriptionId)
      if (success) {
        return NextResponse.json({
          message: 'Subscription synced successfully',
          subscriptionId,
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to sync subscription or subscription not found' },
          { status: 404 }
        )
      }
    }

    if (userId) {
      const success = await syncSubscriptionByUserId(userId)
      if (success) {
        return NextResponse.json({
          message: 'User subscription synced successfully',
          userId,
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to sync user subscription or user not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Must provide userId, subscriptionId, or all=true' },
      { status: 400 }
    )
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error('Sync subscriptions error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
