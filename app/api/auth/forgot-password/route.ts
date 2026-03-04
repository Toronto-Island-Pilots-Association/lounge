import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { resend, sendPasswordResetEmail } from '@/lib/resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectTo = `${appUrl}/reset-password`

    // Send from TIPA via Resend when configured; otherwise Supabase sends the email
    if (resend) {
      try {
        const adminClient = createServiceRoleClient()
        const { data, error } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email: trimmedEmail,
          options: { redirectTo },
        })

        if (!error && data?.properties?.action_link) {
          const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
          const rawLink = data.properties.action_link
          const resetLink = rawLink.startsWith('http')
            ? rawLink
            : `${supabaseUrl}/${rawLink.replace(/^\//, '')}`
          await sendPasswordResetEmail(trimmedEmail, resetLink)
        }
        // If error or no link, do not reveal (e.g. user not found); still return generic success
      } catch (err) {
        console.error('Password reset (TIPA email) error:', err)
      }
    } else {
      const supabase = await createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      })
      if (error) {
        console.error('Password reset request error:', error.message)
      }
    }

    return NextResponse.json({
      message:
        'If an account exists for this email, you will receive a password reset link shortly. Please check your inbox and spam folder.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      {
        message:
          'If an account exists for this email, you will receive a password reset link shortly. Please check your inbox and spam folder.',
      },
      { status: 200 }
    )
  }
}
