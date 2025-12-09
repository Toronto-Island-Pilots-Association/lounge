import { createClient } from '@/lib/supabase/server'
import { appendMemberToSheet } from '@/lib/google-sheets'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

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

      // Track if this is a new user (profile was just created)
      let isNewUser = false

      // If profile doesn't exist, create it
      const isProfileNotFound = profileError && (
        (typeof profileError === 'object' && 'code' in profileError && profileError.code === 'PGRST116') ||
        (typeof profileError === 'object' && 'message' in profileError && String(profileError.message).includes('No rows'))
      )
      
      if (!profile && isProfileNotFound) {
        const userMetadata = data.user.user_metadata || {}
        const email = data.user.email || ''
        
        // Extract name from metadata (Google provides name, full_name, etc.)
        const fullName = userMetadata.full_name || userMetadata.name || null
        const firstName = userMetadata.first_name || (fullName ? fullName.split(' ')[0] : null)
        const lastName = userMetadata.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : null)

        const clientToUse = adminClient || supabase
        const { data: createdProfile, error: insertError } = await clientToUse
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: email.toLowerCase().trim(),
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            role: 'member',
            membership_level: 'basic',
          })
          .select()
          .single()

        if (!insertError && createdProfile) {
          profile = createdProfile
          isNewUser = true // Mark as new user since we just created the profile
          console.log('Successfully created user profile for OAuth user')
        } else {
          console.error('Error creating user profile:', insertError)
          // Continue anyway - profile might be created by trigger
        }
      } else if (profile) {
        // Profile already exists - check if user was created recently (within last 5 seconds)
        // This handles the case where the trigger created the profile
        const userCreatedAt = data.user.created_at ? new Date(data.user.created_at).getTime() : 0
        const now = Date.now()
        const fiveSecondsAgo = now - 5000
        
        // If user was created very recently, it's likely a new user
        if (userCreatedAt > fiveSecondsAgo) {
          isNewUser = true
        }
      }

      // Append to Google Sheets only for NEW users (non-blocking)
      if (profile && isNewUser) {
        appendMemberToSheet(profile).catch(err => {
          console.error('Failed to append member to Google Sheet:', err)
        })
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

