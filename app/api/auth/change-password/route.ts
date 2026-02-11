import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { appendMemberToSheet } from '@/lib/google-sheets'

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify current password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      )
    }

    // Check if user was invited and update status to approved
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
        const { data: authUser } = await adminClient.auth.admin.getUserById(user.id)
        const wasInvited = authUser?.user?.user_metadata?.invited_by_admin === true

        if (wasInvited) {
          // Get full profile to check status and append to Google Sheets
          const { data: profile } = await adminClient
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          // Update to approved if still pending
          if (profile && profile.status === 'pending') {
            // Check if member has any payments
            const { data: payments } = await adminClient
              .from('payments')
              .select('id')
              .eq('user_id', user.id)
              .limit(1)

            // Check if member has active Stripe or PayPal subscription
            const hasActiveSubscription = profile.stripe_subscription_id || profile.paypal_subscription_id
            const hasPayments = payments && payments.length > 0

            // Prepare update object
            const updateData: any = { status: 'approved' }

            // Get membership level from user_metadata if set, otherwise default to 'Associate'
            const membershipLevelFromMetadata = authUser?.user?.user_metadata?.membership_level
            const membershipLevel = membershipLevelFromMetadata || 'Associate'

            // If no payments and no active subscription, set membership level and Oct 1st expiration
            if (!hasPayments && !hasActiveSubscription) {
              // Calculate October 1st - current year if before Oct 1, next year if after Oct 1
              const now = new Date()
              const currentYear = now.getFullYear()
              const oct1ThisYear = new Date(currentYear, 9, 1) // Month is 0-indexed, so 9 = October
              const oct1NextYear = new Date(currentYear + 1, 9, 1)
              
              // Use this year's Oct 1 if we're before it, otherwise next year's
              const expirationDate = now < oct1ThisYear ? oct1ThisYear : oct1NextYear

              updateData.membership_level = membershipLevel
              updateData.membership_expires_at = expirationDate.toISOString()
            } else {
              // If they have payments/subscriptions, still set the membership level from metadata if provided
              if (membershipLevelFromMetadata) {
                updateData.membership_level = membershipLevelFromMetadata
              }
            }

            const { data: updatedProfile } = await adminClient
              .from('user_profiles')
              .update(updateData)
              .eq('id', user.id)
              .select()
              .single()

            // Append to Google Sheets when status changes from pending to approved
            if (updatedProfile) {
              appendMemberToSheet(updatedProfile).catch(err => {
                console.error('Failed to append invited user to Google Sheet after password change:', err)
              })
            }
          }
        }
      } catch (statusError) {
        // Don't fail password change if status update fails
        console.error('Error updating invited user status:', statusError)
      }
    }

    return NextResponse.json({ 
      message: 'Password updated successfully',
      statusUpdated: true 
    })
  } catch (error: any) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while changing password' },
      { status: 500 }
    )
  }
}

