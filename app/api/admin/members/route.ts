import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendMemberApprovalEmail } from '@/lib/resend'
import { appendMemberToSheet } from '@/lib/google-sheets'
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

    return NextResponse.json({ members: data })
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

