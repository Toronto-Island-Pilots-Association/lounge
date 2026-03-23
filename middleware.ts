import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getOrgByHostname } from '@/lib/org'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const org = await getOrgByHostname(hostname)

  // Build request headers for downstream (API routes, server components)
  const requestHeaders = new Headers(request.headers)
  if (org) {
    requestHeaders.set('x-org-id', org.id)
    requestHeaders.set('x-org-slug', org.slug)
  }

  // Refresh Supabase auth session (keeps cookies fresh)
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  // Propagate org headers to the response so client components can read them
  if (org) {
    response.headers.set('x-org-id', org.id)
    response.headers.set('x-org-slug', org.slug)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
