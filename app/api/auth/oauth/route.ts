import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') || 'google'
    const host = request.headers.get('host') ?? 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

    // `next` is an optional absolute URL to land on after auth (e.g. an org subdomain URL).
    // `redirectTo` is the explicit callback URL (used by platform login's GoogleButton).
    // When `next` is provided (org login flow), always callback to this domain so the
    // PKCE verifier cookie is available on the same domain as the code exchange.
    const next = searchParams.get('next')
    let redirectTo = searchParams.get('redirectTo') || `${protocol}://${host}/auth/callback`
    if (next) {
      redirectTo = `${protocol}://${host}/auth/callback?next=${encodeURIComponent(next)}`
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google',
      options: { redirectTo },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Redirect the browser straight to Google — no client-side round-trip needed
    return NextResponse.redirect(data.url)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
