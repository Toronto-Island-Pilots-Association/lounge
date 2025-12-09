import { createClient } from '@/lib/supabase/server'
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
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      // If profile doesn't exist, create it
      if (profileError && (profileError.code === 'PGRST116' || profileError.message?.includes('No rows'))) {
        const userMetadata = data.user.user_metadata || {}
        const email = data.user.email || ''
        
        // Extract name from metadata (Google provides name, full_name, etc.)
        const fullName = userMetadata.full_name || userMetadata.name || null
        const firstName = userMetadata.first_name || (fullName ? fullName.split(' ')[0] : null)
        const lastName = userMetadata.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : null)

        const { error: insertError } = await supabase
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

        if (insertError) {
          console.error('Error creating user profile:', insertError)
          // Continue anyway - profile might be created by trigger
        }
      }
    }

    // Redirect to the dashboard or the next URL
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

