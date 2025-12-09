import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/resend'
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
      let profile = null
      let profileError = null
      
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
          console.log('[Signup] Attempting to append member to Google Sheets', {
            userId: data.user.id,
            email: data.user.email,
            profileId: profile.id,
          })
          appendMemberToSheet(profile).catch(err => {
            console.error('[Signup] Failed to append member to Google Sheet (non-blocking)', {
              userId: data.user.id,
              email: data.user.email,
              profileId: profile.id,
              error: err?.message,
              errorCode: err?.code,
            })
          })
        } else {
          console.warn('[Signup] Skipping Google Sheets append - profile not found', {
            userId: data.user.id,
            email: data.user.email,
          })
        }
      }
      
      // Handle email confirmation and welcome email
      if (data.user && !data.user.email_confirmed_at) {
        // Generate email confirmation link using Supabase admin API
        let confirmationLink = ''
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`
        
        if (adminClient) {
          try {
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
    }

    return NextResponse.json({
      user: data.user,
      message: 'Sign up successful. Please check your email to verify your account.',
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

