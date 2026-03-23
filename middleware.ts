import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getOrgByHostname, getDomainType } from '@/lib/org'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  const domainType = getDomainType(hostname)

  // --- Resolve org for tenant subdomains / custom domains ---
  const org = domainType === 'org' ? await getOrgByHostname(hostname) : null

  // Build request headers for downstream (API routes, server components)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-domain-type', domainType)
  if (org) {
    requestHeaders.set('x-org-id', org.id)
    requestHeaders.set('x-org-slug', org.slug)
  }

  // --- Rewrite marketing and platform to their internal route prefixes ---
  // clublounge.app/foo         → /marketing/foo  (app/marketing/...)
  // platform.clublounge.app/foo → /platform/foo  (app/platform/...)
  // [org].clublounge.app/foo   → /foo            (existing routes, unchanged)
  if (domainType === 'marketing' && !pathname.startsWith('/marketing')) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/marketing${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(rewriteUrl, { headers: requestHeaders })
  }

  if (domainType === 'platform' && !pathname.startsWith('/platform')) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/platform${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(rewriteUrl, { headers: requestHeaders })
  }

  // --- Refresh Supabase auth session ---
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

  // Propagate headers to response
  response.headers.set('x-domain-type', domainType)
  if (org) {
    response.headers.set('x-org-id', org.id)
    response.headers.set('x-org-slug', org.slug)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
