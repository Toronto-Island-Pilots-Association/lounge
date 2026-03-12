import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') || 'google'
    const redirectTo = searchParams.get('redirectTo') || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`

    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Return the OAuth URL for the client to redirect to
    return NextResponse.json({ url: data.url })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
