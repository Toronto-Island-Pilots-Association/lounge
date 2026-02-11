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

    // Allow status changes from admin edit form
    // Status can be changed along with other fields when updating from the admin interface

    const supabase = await createClient()

    // Get current member data to check if status is changing to approved
    const { data: currentMember } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    // Check if status changed to 'approved' (from any status)
    const statusChangedToApproved = updates.status === 'approved' && 
                                     currentMember && 
                                     currentMember.status !== 'approved'

    // If approving a member who hasn't paid yet, set Associate level and Oct 1st expiration
    if (statusChangedToApproved) {
      // Check if member has any payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', id)
        .limit(1)

      // Check if member has active Stripe or PayPal subscription
      const hasActiveSubscription = currentMember.stripe_subscription_id || currentMember.paypal_subscription_id
      const hasPayments = payments && payments.length > 0

      // If no payments and no active subscription, set to Associate with Oct 1st expiration
      if (!hasPayments && !hasActiveSubscription) {
        // Calculate October 1st - current year if before Oct 1, next year if after Oct 1
        const now = new Date()
        const currentYear = now.getFullYear()
        const oct1ThisYear = new Date(currentYear, 9, 1) // Month is 0-indexed, so 9 = October
        const oct1NextYear = new Date(currentYear + 1, 9, 1)
        
        // Use this year's Oct 1 if we're before it, otherwise next year's
        const expirationDate = now < oct1ThisYear ? oct1ThisYear : oct1NextYear

        // Add to updates (will override if already set)
        updates.membership_level = 'Associate'
        updates.membership_expires_at = expirationDate.toISOString()
      }
    }

    // Update the member (database trigger will assign member number if status changes to approved)
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (statusChangedToApproved) {
      // Send approval email
      const memberName = data.full_name || data.first_name || null
      sendMemberApprovalEmail(data.email, memberName).catch(err => {
        console.error('Failed to send approval email:', err)
      })

      // Append to Google Sheets when status changes from pending to approved
      appendMemberToSheet(data).catch(err => {
        console.error('Failed to append member to Google Sheet after approval:', err)
      })
    }

    return NextResponse.json({ member: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}

