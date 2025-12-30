import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // If login successful, check if user was invited by admin and update status
    if (data.user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      // Check if user was invited and needs status update
      if (supabaseUrl && serviceRoleKey) {
        try {
          const { createClient: createAdminClient } = await import('@supabase/supabase-js')
          const adminClient = createAdminClient(
            supabaseUrl,
            serviceRoleKey,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          )

          // Get user metadata to check if they were invited
          const { data: authUser } = await adminClient.auth.admin.getUserById(data.user.id)
          const wasInvited = authUser?.user?.user_metadata?.invited_by_admin === true

          if (wasInvited) {
            // Get current profile status
            const { data: profile } = await adminClient
              .from('user_profiles')
              .select('status')
              .eq('id', data.user.id)
              .single()

            // Return flag indicating password change is needed
            // Status will be updated when they change password
            return NextResponse.json({ 
              user: data.user,
              requiresPasswordChange: true 
            })
          }
        } catch (updateError) {
          // Don't fail login if status update fails
          console.error('Error checking invited user status:', updateError)
        }
      }
    }

    return NextResponse.json({ user: data.user, requiresPasswordChange: false })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}

