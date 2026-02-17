import { createServiceRoleClient } from '@/lib/supabase/server'
import { getMembershipExpiresAtFromSubscription } from '@/lib/settings'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import Stripe from 'stripe'

/**
 * Syncs a user's subscription status from Stripe to the database
 * This ensures the database status matches the actual Stripe subscription state
 * 
 * Business Logic:
 * - If user has active Stripe subscription: status = 'approved', update membership_expires_at
 * - If user has no subscription but status is 'approved': keep as 'approved' (trial mode)
 * - If subscription is cancelled/expired and membership_expires_at is past: status = 'expired'
 * - If subscription is cancelled but membership_expires_at is future: keep 'approved' until expiration
 */
export async function syncSubscriptionStatus(
  userId: string,
  subscriptionId: string | null
): Promise<{ status: 'approved' | 'expired'; membership_expires_at: string | null } | null> {
  const supabase = createServiceRoleClient()

  // Get current user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('status, membership_expires_at, stripe_subscription_id, subscription_cancel_at_period_end')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('Error fetching user profile:', profileError)
    return null
  }

  // If no Stripe subscription ID, check if we should keep approved status (trial mode)
  if (!subscriptionId && !profile.stripe_subscription_id) {
    // User is approved but hasn't paid - this is trial mode
    // Keep status as 'approved' if it already is, don't change to expired
    if (profile.status === 'approved') {
      return {
        status: 'approved',
        membership_expires_at: profile.membership_expires_at,
      }
    }
    // If status is expired and no subscription, check if membership_expires_at is past
    if (profile.status === 'expired') {
      const isExpired = profile.membership_expires_at
        ? new Date(profile.membership_expires_at) < new Date()
        : true

      return {
        status: isExpired ? 'expired' : 'approved',
        membership_expires_at: profile.membership_expires_at,
      }
    }
    return null
  }

  // If Stripe is not enabled, return current state
  if (!isStripeEnabled()) {
    return {
      status: profile.status === 'expired' ? 'expired' : 'approved',
      membership_expires_at: profile.membership_expires_at,
    }
  }

  const stripe = getStripeInstance()
  const activeSubscriptionId = subscriptionId || profile.stripe_subscription_id

  if (!activeSubscriptionId) {
    return null
  }

  try {
    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(activeSubscriptionId)
    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
    const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
    const now = new Date()
    // If subscribed before Sept 1, expiry is Sept 1 next year; else use Stripe period end
    const computedExpiresAt = getMembershipExpiresAtFromSubscription(currentPeriodEnd, currentPeriodStart)

    // Determine status based on subscription state
    let newStatus: 'approved' | 'expired' = 'approved'
    let newExpiresAt: string | null = computedExpiresAt

    // Active subscription states
    const activeStates = ['active', 'trialing', 'past_due']
    
    if (activeStates.includes(subscription.status)) {
      newStatus = 'approved'
      newExpiresAt = computedExpiresAt
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      if (new Date(computedExpiresAt) < now) {
        newStatus = 'expired'
        newExpiresAt = computedExpiresAt
      } else {
        newStatus = 'approved'
        newExpiresAt = computedExpiresAt
      }
    } else {
      newStatus = 'expired'
      newExpiresAt = computedExpiresAt
    }

    const cancelAtPeriodEnd = !!subscription.cancel_at_period_end
    const statusChanged = profile.status !== newStatus
    const expiresAtChanged = profile.membership_expires_at !== newExpiresAt
    const cancelAtPeriodEndChanged = (profile as any).subscription_cancel_at_period_end !== cancelAtPeriodEnd
    const needsBackfillExpires = !profile.membership_expires_at && newExpiresAt

    if (statusChanged || expiresAtChanged || cancelAtPeriodEndChanged || needsBackfillExpires) {
      await supabase
        .from('user_profiles')
        .update({
          status: newStatus,
          membership_expires_at: newExpiresAt,
          subscription_cancel_at_period_end: cancelAtPeriodEnd,
        })
        .eq('id', userId)

      console.log(`Synced subscription for user ${userId}:`, {
        oldStatus: profile.status,
        newStatus,
        oldExpiresAt: profile.membership_expires_at,
        newExpiresAt,
        cancelAtPeriodEnd,
        stripeStatus: subscription.status,
      })
    }

    return {
      status: newStatus,
      membership_expires_at: newExpiresAt,
    }
  } catch (error: any) {
    console.error(`Error syncing subscription ${activeSubscriptionId} for user ${userId}:`, error)

    // If subscription not found in Stripe, it may have been deleted
    // Check if membership_expires_at is past to determine status
    if (error.code === 'resource_missing') {
      const isExpired = profile.membership_expires_at
        ? new Date(profile.membership_expires_at) < new Date()
        : true

      const newStatus: 'approved' | 'expired' = isExpired ? 'expired' : 'approved'

      if (profile.status !== newStatus) {
        await supabase
          .from('user_profiles')
          .update({
            status: newStatus,
            stripe_subscription_id: null,
            subscription_cancel_at_period_end: false,
          })
          .eq('id', userId)
      }

      return {
        status: newStatus,
        membership_expires_at: profile.membership_expires_at,
      }
    }

    return null
  }
}

/**
 * Syncs subscription status for a user by their Stripe subscription ID
 */
export async function syncSubscriptionBySubscriptionId(
  subscriptionId: string
): Promise<boolean> {
  if (!isStripeEnabled()) {
    return false
  }

  const supabase = createServiceRoleClient()

  // Find user by subscription ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, stripe_subscription_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!profile) {
    console.warn(`No user found with subscription ID: ${subscriptionId}`)
    return false
  }

  const result = await syncSubscriptionStatus(profile.id, subscriptionId)
  return result !== null
}

/**
 * Syncs subscription status for a user by their user ID
 */
export async function syncSubscriptionByUserId(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_subscription_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return false
  }

  const result = await syncSubscriptionStatus(userId, profile.stripe_subscription_id || null)
  return result !== null
}
