import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendMemberApprovalEmail } from '@/lib/resend'
import { appendMemberToSheet } from '@/lib/google-sheets'
import { getTrialEndDateAsync, getMembershipFeeForLevel } from '@/lib/settings'
import type { MembershipLevelKey } from '@/lib/settings'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const membersWithTrial = await Promise.all(
      (data ?? []).map(async (member) => {
        const level = (member.membership_level || 'Full') as MembershipLevelKey
        const trialEnd = await getTrialEndDateAsync(level, member.created_at ?? null)
        const expected_fee = await getMembershipFeeForLevel(level)
        return {
          ...member,
          trial_end: trialEnd ? trialEnd.toISOString() : null,
          expected_fee,
        }
      })
    )

    const { data: payments } = await supabase
      .from('payments')
      .select('user_id, amount, currency, payment_method')
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
      payment_summary: latestPaymentByUser.get(member.id) ?? null,
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
    await requireAdmin()
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Convert empty strings to null for timestamp fields (PostgreSQL doesn't accept empty strings for timestamps)
    if (updates.membership_expires_at === '') {
      updates.membership_expires_at = null
    }

    // Allow status changes from admin edit form
    // Status can be changed along with other fields when updating from the admin interface

    const supabase = await createClient()

    // Get current member data to check if status is changing to approved
    const { data: currentMember } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
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

    // If approving a member who hasn't paid yet, set Associate level and Sept 1st expiration
    if (isApproving) {
      // Check if member has any payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', id)
        .limit(1)

      // Check if member has active Stripe or PayPal subscription
      const hasActiveSubscription = currentMember.stripe_subscription_id || currentMember.paypal_subscription_id
      const hasPayments = payments && payments.length > 0

      // If no payments and no active subscription, set trial expiration to Sept 1st (keep existing membership_level)
      if (!hasPayments && !hasActiveSubscription) {
        const now = new Date()
        const currentYear = now.getFullYear()
        const sep1ThisYear = new Date(currentYear, 8, 1)
        const sep1NextYear = new Date(currentYear + 1, 8, 1)
        const expirationDate = now < sep1ThisYear ? sep1ThisYear : sep1NextYear
        updates.membership_expires_at = expirationDate.toISOString()
      }
    }

    // Update the member (database trigger will assign member number if status changes to approved)
    const { data: updatedMember, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Check if status actually changed to 'approved' (verify after update)
    const statusChangedToApproved = currentMember.status !== 'approved' && updatedMember.status === 'approved'

    if (statusChangedToApproved) {
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

    return NextResponse.json({ member: updatedMember })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}

