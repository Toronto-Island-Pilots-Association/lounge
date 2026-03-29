import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: Request) {
  try {
    const h = await headers()
    const orgId = h.get('x-org-id')
    if (!orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
      Sentry.metrics.count('member.login', 1, { attributes: { result: 'failure' } })
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

          // Get profile status for all users (covers both invited and self-signup)
          const { data: profile } = await adminClient
            .from('org_memberships')
            .select('status')
            .eq('user_id', data.user.id)
            .eq('org_id', orgId)
            .maybeSingle()

          if (wasInvited && profile?.status === 'pending') {
            // Invited member who hasn't completed first-time password change yet
            return NextResponse.json({
              user: data.user,
              requiresPasswordChange: true,
            })
          }

          if (profile?.status === 'pending') {
            // Self-signup member waiting for admin approval
            return NextResponse.json({ requiresApproval: true })
          }
        } catch (updateError) {
          // Don't fail login if status update fails
          console.error('Error checking invited user status:', updateError)
        }
      }
    }

    Sentry.metrics.count('member.login', 1, { attributes: { result: 'success' } })
    return NextResponse.json({ user: data.user, requiresPasswordChange: false })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}

