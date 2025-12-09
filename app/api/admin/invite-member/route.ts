import { requireAdmin } from '@/lib/auth'
import { sendInvitationEmail } from '@/lib/resend'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const {
      email,
      firstName,
      lastName,
    } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if member already exists
    const supabase = await createClient()
    const { data: existingMember, error: checkError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      // Any other error is a real problem
      console.error('Error checking for existing member:', checkError)
      return NextResponse.json(
        { error: 'Failed to check if member exists' },
        { status: 500 }
      )
    }

    if (existingMember) {
      return NextResponse.json(
        { 
          error: 'This email is already registered as a member',
          details: `Member: ${existingMember.full_name || existingMember.email}`
        },
        { status: 400 }
      )
    }

    // Generate landing page link
    const landingPageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || null

    // Send invitation email with link to landing page
    await sendInvitationEmail(
      email,
      fullName || email,
      landingPageUrl
    )

    return NextResponse.json({
      message: 'Invitation sent successfully',
      email,
    })
  } catch (error: any) {
    console.error('Invite member error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while sending invitation' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}

