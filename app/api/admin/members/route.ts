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

    const supabase = await createClient()

    // Get current member data to check if status is changing to approved
    const { data: currentMember } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

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

    // Check if status changed from 'pending' to 'approved'
    const statusChangedToApproved = updates.status === 'approved' && 
                                     currentMember && 
                                     currentMember.status === 'pending'

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

