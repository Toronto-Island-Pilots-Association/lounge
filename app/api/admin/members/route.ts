import { requireAdmin } from '@/lib/auth'
import { isPlatformAdminRole } from '@/lib/org-roles'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'
import { sendMemberApprovalEmail } from '@/lib/resend'
import { appendMemberToSheet } from '@/lib/google-sheets'
import {
  getTrialConfig,
  getAllMembershipFees,
  getMembershipFeeForLevel,
  getTrialConfigItemForLevel,
  computeTrialEndFromConfig,
} from '@/lib/settings'
import type { MembershipLevelKey } from '@/lib/settings'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { syncOrgPlanSubscriptionBilling } from '@/lib/org-plan-subscription'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const orgId = request.headers.get('x-org-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Missing org context' }, { status: 400 })
    }
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Fetch once, compute per-member inline — avoids N×2 DB round-trips
    const [trialConfig, allFees] = await Promise.all([getTrialConfig(orgId), getAllMembershipFees()])

    const membersWithTrial = (data ?? []).map((member) => {
      const level = (member.membership_level || 'Full') as MembershipLevelKey
      const item = getTrialConfigItemForLevel(trialConfig, level)
      const trialEnd = computeTrialEndFromConfig(item, member.created_at ?? null)
      const trial_end = trialEnd ? trialEnd.toISOString() : null
      return { ...member, trial_end, expected_fee: allFees[level] }
    })

    const { data: payments } = await supabase
      .from('payments')
      .select('user_id, amount, currency, payment_method')
      .eq('org_id', orgId)
      .order('payment_date', { ascending: false })

    const latestPaymentByUser = new Map<string, { amount: number; currency: string; payment_method: string }>()
    for (const p of payments ?? []) {
      if (!latestPaymentByUser.has(p.user_id)) {
        latestPaymentByUser.set(p.user_id, {
          amount: p.amount,
          currency: p.currency || 'CAD',
          payment_method: p.payment_method,
        })
      }
    }

    const membersWithPayment = membersWithTrial.map((member) => ({
      ...member,
      payment_summary: latestPaymentByUser.get(member.user_id) ?? null,
    }))

    return NextResponse.json({ members: membersWithPayment })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireAdmin()
    const orgId = request.headers.get('x-org-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Missing org context' }, { status: 400 })
    }
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    if (updates.role !== undefined && !isPlatformAdminRole(currentUser.profile.role)) {
      return NextResponse.json({ error: 'Only org admins can change roles' }, { status: 403 })
    }

    // Convert empty strings to null for timestamp fields (PostgreSQL doesn't accept empty strings for timestamps)
    if (updates.membership_expires_at === '') {
      updates.membership_expires_at = null
    }

    // Allow status changes from admin edit form
    // Status can be changed along with other fields when updating from the admin interface

    const supabase = await createClient()

    // Get current member data (via member_profiles view — id = org_memberships.id)
    const { data: currentMember } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // user_id is the auth.users UUID
    const authUserId = currentMember.user_id

    // If admin is changing email: update Auth first, then profile stays in sync via updates below
    if (typeof updates.email === 'string') {
      const newEmail = updates.email.trim().toLowerCase()
      if (!newEmail) {
        return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 })
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newEmail)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
      const currentEmail = (currentMember.email || '').trim().toLowerCase()
      if (newEmail !== currentEmail) {
        const adminClient = createServiceRoleClient()
        const { error: authError } = await adminClient.auth.admin.updateUserById(authUserId, {
          email: newEmail,
          email_confirm: true,
        })
        if (authError) {
          return NextResponse.json(
            { error: authError.message || 'Failed to update email in authentication' },
            { status: 400 }
          )
        }
        updates.email = newEmail
      }
    }

    const membershipLevelChanged =
      updates.membership_level != null && updates.membership_level !== currentMember.membership_level

    if (membershipLevelChanged) {
      if (currentMember.stripe_subscription_id && isStripeEnabled()) {
        const stripe = getStripeInstance()
        const newLevel = updates.membership_level as MembershipLevelKey
        try {
          const subscription = await stripe.subscriptions.retrieve(
            currentMember.stripe_subscription_id,
            { expand: ['items.data.price'] }
          )
          const item = subscription.items.data[0]
          if (item) {
            const newFee = await getMembershipFeeForLevel(newLevel)
            const newPrice = await stripe.prices.create({
              currency: 'cad',
              unit_amount: Math.round(newFee * 100),
              recurring: { interval: 'year' },
              product_data: { name: `TIPA Annual Membership (${newLevel})` },
            })
            await stripe.subscriptions.update(currentMember.stripe_subscription_id, {
              items: [{ id: item.id, price: newPrice.id }],
              proration_behavior: 'create_prorations',
            })
          } else {
            await stripe.subscriptions.cancel(currentMember.stripe_subscription_id)
            updates.stripe_subscription_id = null
            updates.subscription_cancel_at_period_end = false
            updates.membership_expires_at = null
          }
        } catch (err) {
          console.error('Failed to update Stripe subscription for member', id, err)
          try {
            await stripe.subscriptions.cancel(currentMember.stripe_subscription_id)
          } catch (cancelErr) {
            console.error('Failed to cancel Stripe subscription after update error', cancelErr)
          }
          updates.stripe_subscription_id = null
          updates.subscription_cancel_at_period_end = false
          updates.membership_expires_at = null
        }
      } else {
        updates.membership_expires_at = null
      }
    }

    // Check if status is being changed to 'approved' (from any status)
    const isApproving = updates.status === 'approved' && currentMember.status !== 'approved'

    if (isApproving) {
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', authUserId)
        .limit(1)

      const hasActiveSubscription = currentMember.stripe_subscription_id || currentMember.paypal_subscription_id
      const hasPayments = payments && payments.length > 0

      if (!hasPayments && !hasActiveSubscription) {
        const trialConfig = await getTrialConfig(orgId)
        const level = (currentMember.membership_level || 'Full') as MembershipLevelKey
        const item = getTrialConfigItemForLevel(trialConfig, level)
        const trialEnd = computeTrialEndFromConfig(item, currentMember.created_at ?? null)
        if (trialEnd) {
          updates.membership_expires_at = trialEnd.toISOString()
        }
      }
    }

    // Split updates into identity fields (user_profiles) and membership fields (org_memberships)
    const identityFields = ['email', 'full_name', 'first_name', 'last_name', 'phone', 'street', 'city', 'province_state', 'postal_zip_code', 'country', 'profile_picture_url', 'notify_replies']
    const identityUpdates: Record<string, unknown> = {}
    const membershipUpdates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (identityFields.includes(key)) {
        identityUpdates[key] = value
      } else {
        membershipUpdates[key] = value
      }
    }

    if (Object.keys(identityUpdates).length > 0) {
      const { error: identityError } = await supabase
        .from('user_profiles')
        .update(identityUpdates)
        .eq('user_id', authUserId)
      if (identityError) {
        return NextResponse.json({ error: identityError.message }, { status: 400 })
      }
    }

    // Update membership fields (database trigger will assign member number if status changes to approved)
    if (Object.keys(membershipUpdates).length > 0) {
      const { error: membershipError } = await supabase
        .from('org_memberships')
        .update(membershipUpdates)
        .eq('id', id)
        .eq('org_id', orgId)
      if (membershipError) {
        return NextResponse.json({ error: membershipError.message }, { status: 400 })
      }
    }

    // Re-fetch the updated member via member_profiles view
    const { data: updatedMember, error } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error || !updatedMember) {
      return NextResponse.json({ error: error?.message || 'Failed to fetch updated member' }, { status: 400 })
    }

    // Check if status actually changed to 'approved' (verify after update)
    const statusChangedToApproved = currentMember.status !== 'approved' && updatedMember.status === 'approved'

    if (statusChangedToApproved) {
      Sentry.metrics.count('member.approved', 1, { attributes: { membership_level: updatedMember.membership_level } })

      // Send approval email
      const memberName = updatedMember.full_name || updatedMember.first_name || null
      sendMemberApprovalEmail(updatedMember.email, memberName).catch(err => {
        console.error('Failed to send approval email:', err)
      })

      // Append to Google Sheets when status changes to approved
      appendMemberToSheet(updatedMember).catch(err => {
        console.error('Failed to append member to Google Sheet after approval:', err)
      })
    }

    if (currentMember.status !== updatedMember.status) {
      syncOrgPlanSubscriptionBilling(orgId).catch(err => {
        console.error('Failed to sync org billing after member status change:', err)
      })
    }

    return NextResponse.json({ member: updatedMember })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}
