import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    })

    // Always return success to avoid revealing whether the email exists (security)
    if (error) {
      console.error('Password reset request error:', error.message)
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
