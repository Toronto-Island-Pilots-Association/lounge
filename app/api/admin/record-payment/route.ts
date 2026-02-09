import { requireAdmin, getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendMemberApprovalEmail } from '@/lib/resend'
import { appendMemberToSheet } from '@/lib/google-sheets'
import { getMembershipFee } from '@/lib/settings'
import { NextResponse } from 'next/server'

/**
 * Admin endpoint to record manual payments (cash or PayPal)
 * 
 * POST /api/admin/record-payment
 * Body: {
 *   userId: string,
 *   paymentMethod: 'cash' | 'paypal' | 'wire',
 *   membershipExpiresAt?: string (ISO date, defaults to 1 year from now),
 *   notes?: string,
 *   clearStripeSubscription?: boolean (defaults to true)
 * }
 */
export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const {
      userId,
      paymentMethod,
      membershipExpiresAt,
      notes,
      clearStripeSubscription = true,
    } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!paymentMethod || !['cash', 'paypal', 'wire'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Payment method must be "cash", "paypal", or "wire"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current member data
    const { data: currentMember, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !currentMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Calculate expiration date (default to 1 year from now)
    const expiresAt = membershipExpiresAt
      ? new Date(membershipExpiresAt)
      : (() => {
          const date = new Date()
          date.setFullYear(date.getFullYear() + 1)
          return date
        })()

    // Prepare updates
    const updates: any = {
      status: 'approved',
      membership_expires_at: expiresAt.toISOString(),
    }

    // If payment is via PayPal, store PayPal subscription ID if provided
    if (paymentMethod === 'paypal' && body.paypalSubscriptionId) {
      updates.paypal_subscription_id = body.paypalSubscriptionId
    }
    
    // Note: Wire transfers don't have subscription IDs, they're one-time payments

    // Clear Stripe subscription if requested (default behavior)
    // This makes sense when payment is received via cash/PayPal/wire
    if (clearStripeSubscription && currentMember.stripe_subscription_id) {
      updates.stripe_subscription_id = null
      updates.stripe_customer_id = null
    }

    // Update the member
    const { data: updatedMember, error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    // Check if status changed to 'approved' (from pending/expired)
    const statusChangedToApproved =
      currentMember.status !== 'approved' && updatedMember.status === 'approved'

    if (statusChangedToApproved) {
      // Send approval email
      const memberName = updatedMember.full_name || updatedMember.first_name || null
      sendMemberApprovalEmail(updatedMember.email, memberName).catch((err) => {
        console.error('Failed to send approval email:', err)
      })

      // Append to Google Sheets when status changes to approved
      appendMemberToSheet(updatedMember).catch((err) => {
        console.error('Failed to append member to Google Sheet after approval:', err)
      })
    }

    // Get membership fee for payment record
    const membershipFee = await getMembershipFee()
    
    // Get current admin user who is recording the payment
    const adminUser = await getCurrentUser()
    
    // Record payment in payments table
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        payment_method: paymentMethod,
        amount: membershipFee,
        currency: 'CAD',
        payment_date: new Date().toISOString(),
        membership_expires_at: expiresAt.toISOString(),
        paypal_subscription_id: paymentMethod === 'paypal' && body.paypalSubscriptionId ? body.paypalSubscriptionId : null,
        recorded_by: adminUser?.id || null,
        notes: notes || null,
        status: 'completed',
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error recording payment:', paymentError)
      // Don't fail the request if payment record fails, but log it
    }

    return NextResponse.json({
      message: 'Payment recorded successfully',
      member: updatedMember,
      payment: paymentRecord,
      paymentDetails: {
        method: paymentMethod,
        amount: membershipFee,
        expiresAt: expiresAt.toISOString(),
        notes,
      },
    })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Record payment error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
