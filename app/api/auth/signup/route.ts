import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail, sendNewMemberNotificationToAdmins } from '@/lib/resend'
import { appendMemberToSheet } from '@/lib/google-sheets'
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

    // Normalize email to lowercase and trim
    const normalizedEmail = email.toLowerCase().trim()
    
    // Helper to convert empty strings to null (for database compatibility)
    const toNullIfEmpty = (value: string | undefined | null): string | null => {
      return value && value.trim() ? value.trim() : null
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: toNullIfEmpty(fullName) || toNullIfEmpty(`${firstName || ''} ${lastName || ''}`.trim()) || null,
          first_name: toNullIfEmpty(firstName),
          last_name: toNullIfEmpty(lastName),
          phone: toNullIfEmpty(phone),
          pilot_license_type: toNullIfEmpty(pilotLicenseType),
          aircraft_type: toNullIfEmpty(aircraftType),
          call_sign: toNullIfEmpty(callSign),
          how_often_fly_from_ytz: toNullIfEmpty(howOftenFlyFromYTZ),
          how_did_you_hear: toNullIfEmpty(howDidYouHear),
          role: 'member',
          membership_level: 'basic',
        },
      },
    })

    if (error) {
      console.error('Supabase auth signup error:', error)
      return NextResponse.json({ 
        error: error.message,
        details: error 
      }, { status: 400 })
    }

    if (!data.user) {
      console.error('Signup succeeded but no user data returned')
      return NextResponse.json(
        { error: 'Signup failed: No user data returned' },
        { status: 500 }
      )
    }

    // Handle post-signup tasks (Google Sheets, email confirmation, welcome email)
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
      
      // Wait for the database trigger to create the profile
      // Retry logic to handle potential timing issues
      let profile: any = null
      let profileError: any = null
      
      if (adminClient) {
        // Try to fetch profile with retries (trigger might take a moment)
        for (let attempt = 0; attempt < 3; attempt++) {
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
        
        // If profile wasn't found after retries, try to create it manually
        // This is a fallback in case the database trigger fails
        if (!profile && adminClient) {
          console.warn('Profile not created by trigger, attempting manual creation')
          try {
            // Ensure membership_level and role match the database constraints exactly
            const membershipLevel: 'basic' | 'cadet' | 'captain' = 'basic'
            const userRole: 'member' | 'admin' = 'member'
            
            const { data: createdProfile, error: createError } = await adminClient
              .from('user_profiles')
              .insert({
                id: data.user.id,
                email: (data.user.email || normalizedEmail).toLowerCase().trim(),
                full_name: toNullIfEmpty(fullName) || toNullIfEmpty(`${firstName || ''} ${lastName || ''}`.trim()) || null,
                first_name: toNullIfEmpty(firstName),
                last_name: toNullIfEmpty(lastName),
                phone: toNullIfEmpty(phone),
                pilot_license_type: toNullIfEmpty(pilotLicenseType),
                aircraft_type: toNullIfEmpty(aircraftType),
                call_sign: toNullIfEmpty(callSign),
                how_often_fly_from_ytz: toNullIfEmpty(howOftenFlyFromYTZ),
                how_did_you_hear: toNullIfEmpty(howDidYouHear),
                role: userRole,
                membership_level: membershipLevel,
                status: 'pending',
              })
              .select()
              .single()
            
            if (!createError && createdProfile) {
              profile = createdProfile
              console.log('Successfully created user profile manually')
            } else {
              console.error('Failed to create user profile manually:', createError)
            }
          } catch (error) {
            console.error('Error creating user profile manually:', error)
          }
        }
        
        // Log if profile still wasn't found/created
        if (!profile) {
          console.error('User profile could not be created:', {
            userId: data.user.id,
            email: data.user.email,
            profileError: profileError
          })
        }
        
        // Append to Google Sheets if profile was found (non-blocking)
        if (profile) {
          appendMemberToSheet(profile).catch(err => {
            console.error('Failed to append member to Google Sheet:', err)
          })

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
        }
      }
      
    }
    
    // Handle welcome email
    if (data.user) {
      const displayName = fullName || `${firstName || ''} ${lastName || ''}`.trim() || 'Member'
      
      // Send welcome email
      try {
        const result = await sendWelcomeEmail(data.user.email!, displayName)
        if (result.success) {
          console.log('Welcome email sent successfully to:', data.user.email)
        } else {
          console.error('Welcome email failed to send:', result.error)
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError)
        // Don't fail the signup if email fails
      }
    }

    return NextResponse.json({
      user: data.user,
      message: 'Sign up successful. You can now log in to your account.',
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { 
        error: 'An error occurred during signup',
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

