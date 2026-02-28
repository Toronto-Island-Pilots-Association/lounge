import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/discussions'

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }

    if (data.user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      let adminClient = null
      
      // Create admin client if service role key is available
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl) {
        try {
          const { createClient: createAdminClient } = await import('@supabase/supabase-js')
          adminClient = createAdminClient(
            supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          )
        } catch (error) {
          console.error('Error creating admin client:', error)
        }
      }

      // Check if user profile exists
      // Wait for the database trigger to create the profile (retry logic)
      let profile = null
      let profileError = null
      
      if (adminClient) {
        // Try to fetch profile with retries (trigger might take a moment)
        for (let attempt = 0; attempt < 5; attempt++) {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
          try {
            const { data: fetchedProfile, error: fetchedError } = await adminClient
              .from('user_profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()
            
            if (!fetchedError && fetchedProfile) {
              profile = fetchedProfile
              profileError = null
              break
            } else {
              profileError = fetchedError
            }
          } catch (error) {
            console.error(`Error fetching user profile (attempt ${attempt + 1}):`, error)
            profileError = error
          }
        }
      } else {
        // Fallback: try with regular client
        const { data: fetchedProfile, error: fetchedError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        if (!fetchedError && fetchedProfile) {
          profile = fetchedProfile
        } else {
          profileError = fetchedError
        }
      }

      // Check if profile exists - if not, this is a new user signing up via Google
      // Redirect them to complete their profile
      const isProfileNotFound = profileError && (
        (typeof profileError === 'object' && 'code' in profileError && profileError.code === 'PGRST116') ||
        (typeof profileError === 'object' && 'message' in profileError && String(profileError.message).includes('No rows'))
      )
      
      if (!profile && isProfileNotFound) {
        // New user signing up via Google - redirect to complete profile page
        // The profile will be created by the database trigger, but we need to wait a moment
        // For now, redirect to complete-profile page where they can fill in additional info
        return NextResponse.redirect(new URL('/complete-profile', requestUrl.origin))
      }
      
      // Check if existing profile is incomplete (missing key fields)
      // Redirect to complete profile if needed
      if (profile) {
        const isIncomplete = !profile.phone && !profile.pilot_license_type && !profile.aircraft_type
        if (isIncomplete) {
          return NextResponse.redirect(new URL('/complete-profile', requestUrl.origin))
        }
      }

      // Track if this is a new user (profile was just created by trigger)
      let isNewUser = false
      
      if (profile) {
        // Profile exists - check if user was created recently (within last 5 seconds)
        // This handles the case where the trigger created the profile
        const userCreatedAt = data.user.created_at ? new Date(data.user.created_at).getTime() : 0
        const now = Date.now()
        const fiveSecondsAgo = now - 5000
        
        // If user was created very recently, it's likely a new user
        if (userCreatedAt > fiveSecondsAgo) {
          isNewUser = true
        }
      }

      // Send welcome email to new OAuth users
      // Note: Google Sheets append happens after profile completion, not during OAuth callback
      if (profile && isNewUser) {
        try {
          const { sendWelcomeEmail } = await import('@/lib/resend')
          const displayName = profile.full_name || profile.first_name || profile.email || 'Member'
          const result = await sendWelcomeEmail(profile.email, displayName)
          if (!result.success) {
            console.error('Welcome email failed to send:', result.error)
          }
        } catch (emailError) {
          console.error('Error sending welcome email to OAuth user:', emailError)
        }

        // Notify admins about new member (non-blocking)
        // Try to get admin emails - use adminClient if available, otherwise use regular client
        const clientForAdmins = adminClient || supabase
        try {
          const { data: admins } = await clientForAdmins
            .from('user_profiles')
            .select('email')
            .eq('role', 'admin')
            .eq('status', 'approved')

          if (admins && admins.length > 0) {
            const { sendNewMemberNotificationToAdmins } = await import('@/lib/resend')
            const adminEmails = admins.map(a => a.email).filter(Boolean)
            
            // Send notification to each admin
            Promise.all(
              adminEmails.map(adminEmail =>
                sendNewMemberNotificationToAdmins(
                  profile.email,
                  profile.full_name || profile.first_name || null,
                  {
                    call_sign: profile.call_sign,
                    aircraft_type: profile.aircraft_type,
                    pilot_license_type: profile.pilot_license_type,
                    phone: profile.phone,
                    membership_level: profile.membership_level,
                    membership_class: profile.membership_class,
                    street: profile.street,
                    city: profile.city,
                    province_state: profile.province_state,
                    postal_zip_code: profile.postal_zip_code,
                    country: profile.country,
                    how_often_fly_from_ytz: profile.how_often_fly_from_ytz,
                    is_copa_member: profile.is_copa_member,
                    join_copa_flight_32: profile.join_copa_flight_32,
                    copa_membership_number: profile.copa_membership_number,
                    statement_of_interest: profile.statement_of_interest,
                    how_did_you_hear: profile.how_did_you_hear,
                    is_student_pilot: profile.is_student_pilot,
                    flight_school: profile.flight_school,
                    instructor_name: profile.instructor_name,
                  },
                  adminEmail
                ).catch(err => {
                  console.error(`Failed to notify admin ${adminEmail}:`, err)
                })
              )
            ).catch(err => {
              console.error('Error sending admin notifications:', err)
            })
          } else {
            console.warn('No admin emails found to notify about new member')
          }
        } catch (err) {
          console.error('Error fetching admin emails for notification:', err)
        }
      } else if (!profile) {
        console.warn('User profile not found/created for OAuth user:', {
          userId: data.user.id,
          email: data.user.email,
          profileError: profileError
        })
      }
    }

    // Redirect to the dashboard or the next URL
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

