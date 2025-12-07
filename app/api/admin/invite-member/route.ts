import { requireAdmin } from '@/lib/auth'
import { sendInvitationEmail } from '@/lib/resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const {
      email,
      firstName,
      lastName,
      phone,
      pilotLicenseType,
      aircraftType,
      callSign,
      howOftenFlyFromYTZ,
      howDidYouHear,
      role = 'member',
      membershipLevel = 'free',
    } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || null

    // Generate invitation link
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`
    
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo,
        data: {
          full_name: fullName,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
          pilot_license_type: pilotLicenseType || null,
          aircraft_type: aircraftType || null,
          call_sign: callSign || null,
          how_often_fly_from_ytz: howOftenFlyFromYTZ || null,
          how_did_you_hear: howDidYouHear || null,
          role: role,
          membership_level: membershipLevel,
        },
      },
    })

    if (linkError) {
      console.error('Error generating invitation link:', linkError)
      return NextResponse.json(
        { error: linkError.message || 'Failed to generate invitation link' },
        { status: 400 }
      )
    }

    if (!linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: 'Failed to generate invitation link' },
        { status: 500 }
      )
    }

    // Send invitation email
    const invitationLink = linkData.properties.action_link
    await sendInvitationEmail(
      email,
      fullName || email,
      invitationLink,
      {
        firstName,
        lastName,
        phone,
        pilotLicenseType,
        aircraftType,
        callSign,
        howOftenFlyFromYTZ,
        howDidYouHear,
      }
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

