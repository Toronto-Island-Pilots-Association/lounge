import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { 
      email, 
      password, 
      fullName,
      firstName,
      lastName,
      phone,
      pilotLicenseType,
      aircraftType,
      callSign,
      howOftenFlyFromYTZ,
      howDidYouHear
    } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || `${firstName || ''} ${lastName || ''}`.trim() || null,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
          pilot_license_type: pilotLicenseType || null,
          aircraft_type: aircraftType || null,
          call_sign: callSign || null,
          how_often_fly_from_ytz: howOftenFlyFromYTZ || null,
          how_did_you_hear: howDidYouHear || null,
          role: 'member',
          membership_level: 'free',
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data.user && !data.user.email_confirmed_at) {
      // Generate email confirmation link using Supabase admin API
      let confirmationLink = ''
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`
      
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl) {
        try {
          const { createClient: createAdminClient } = await import('@supabase/supabase-js')
          const adminClient = createAdminClient(
            supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          )
          
          // Generate email confirmation link
          const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: 'signup',
            email: data.user.email!,
            password: password,
            options: {
              redirectTo: redirectTo,
            }
          })
          
          if (!linkError && linkData?.properties?.action_link) {
            confirmationLink = linkData.properties.action_link
          }
        } catch (error) {
          console.error('Error generating confirmation link:', error)
        }
      }
      
      // Send welcome email with confirmation link
      const displayName = fullName || `${firstName || ''} ${lastName || ''}`.trim() || 'Member'
      await sendWelcomeEmail(data.user.email!, displayName, confirmationLink)
    } else if (data.user) {
      // User already confirmed, just send welcome email
      const displayName = fullName || `${firstName || ''} ${lastName || ''}`.trim() || 'Member'
      await sendWelcomeEmail(data.user.email!, displayName)
    }

    return NextResponse.json({
      user: data.user,
      message: 'Sign up successful. Please check your email to verify your account.',
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    )
  }
}

