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

          // Get user metadata to check if they were invited (admin, member, or bulk)
          const { data: authUser } = await adminClient.auth.admin.getUserById(data.user.id)
          const meta = authUser?.user?.user_metadata
          const wasInvited =
            meta?.invited_by_admin === true || meta?.invited_by_member === true

          if (wasInvited) {
            // Get profile: we set status to 'approved' when they change password, so use that as source of truth
            const { data: profile } = await adminClient
              .from('user_profiles')
              .select('status')
              .eq('id', data.user.id)
              .single()

            // Only require password change if still pending (have not completed first-time change)
            if (profile?.status === 'pending') {
              return NextResponse.json({
                user: data.user,
                requiresPasswordChange: true,
              })
            }
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

