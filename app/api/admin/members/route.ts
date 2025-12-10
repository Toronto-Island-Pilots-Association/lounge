import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendMemberApprovalEmail } from '@/lib/resend'
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
      .select('status, email, full_name, first_name')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send approval email if status changed to 'approved'
    if (updates.status === 'approved' && currentMember && currentMember.status !== 'approved') {
      const memberName = data.full_name || data.first_name || null
      sendMemberApprovalEmail(data.email, memberName).catch(err => {
        console.error('Failed to send approval email:', err)
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

