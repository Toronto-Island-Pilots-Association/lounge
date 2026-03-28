import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getOrgByHostname, getDomainType } from '@/lib/org'

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // Marketing domain renders at `/marketing/*` via middleware rewrites.
  // Exempt root-level auth pages so `/login` (and friends) resolve to the
  // real routes in `app/login`, `app/forgot-password`, etc.
  const marketingRewriteExemptPaths = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/change-password',
  ]

  const isMarketingAuthExempt =
    marketingRewriteExemptPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  // In local dev, allow ?__domain=platform|marketing|tipa (or any org slug) to simulate domains
  const devDomainOverride = process.env.NODE_ENV === 'development'
    ? request.nextUrl.searchParams.get('__domain')
    : null

  const effectiveHostname = devDomainOverride
    ? `${devDomainOverride}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'}`
    : hostname

  const domainType = getDomainType(effectiveHostname)
  const org = domainType === 'org' ? await getOrgByHostname(effectiveHostname) : null

  // Build request headers for downstream (API routes, server components)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-domain-type', domainType)
  if (org) {
    requestHeaders.set('x-org-id', org.id)
    requestHeaders.set('x-org-slug', org.slug)
  }

  // Catch OAuth codes that Supabase delivers to the wrong path (site URL fallback).
  // This happens when redirectTo isn't in Supabase's allowed URL list.
  // Forward to /auth/callback, inferring the right `next` from domain type.
  if (request.nextUrl.searchParams.has('code') && !pathname.startsWith('/auth')) {
    const code = request.nextUrl.searchParams.get('code')!
    const state = request.nextUrl.searchParams.get('state')

    if (domainType === 'marketing') {
      // The PKCE verifier lives on the platform domain (where signInWithOAuth ran).
      // Forward the code there so the exchange can succeed.
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'
      const proto = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const port = process.env.NODE_ENV === 'development' ? ':3000' : ''
      const platformCallback = new URL(`${proto}://platform.${rootDomain}${port}/auth/callback`)
      platformCallback.searchParams.set('code', code)
      platformCallback.searchParams.set('next', '/platform/dashboard')
      if (state) platformCallback.searchParams.set('state', state)
      return NextResponse.redirect(platformCallback)
    }

    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    if (!callbackUrl.searchParams.has('next')) {
      if (domainType === 'platform') callbackUrl.searchParams.set('next', '/platform/dashboard')
      else if (domainType === 'org') callbackUrl.searchParams.set('next', '/discussions')
    }
    return NextResponse.redirect(callbackUrl)
  }

  // Block cross-domain access: org tenants cannot reach /platform or /marketing routes
  if (domainType === 'org' && (pathname.startsWith('/platform') || pathname.startsWith('/marketing'))) {
    return new NextResponse(null, { status: 404 })
  }

  // Block marketing domain from reaching /platform routes
  if (domainType === 'marketing' && pathname.startsWith('/platform')) {
    return new NextResponse(null, { status: 404 })
  }

  // Rewrite marketing and platform to their internal route prefixes
  // clublounge.app/foo          → /marketing/foo
  // platform.clublounge.app/foo → /platform/foo
  // [org].clublounge.app/foo    → /foo (unchanged)
  // Don't rewrite API routes — they resolve to their actual paths regardless of domain
  if (!pathname.startsWith('/api')) {
    if (
      domainType === 'marketing' &&
      !pathname.startsWith('/marketing') &&
      !pathname.startsWith('/auth') &&
      !isMarketingAuthExempt
    ) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = `/marketing${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(rewriteUrl, { headers: requestHeaders })
    }

    if (domainType === 'platform' && !pathname.startsWith('/platform') && !pathname.startsWith('/auth')) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = `/platform${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(rewriteUrl, { headers: requestHeaders })
    }
  }

  // Refresh Supabase auth session
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  // Set cookies on the root domain so sessions are shared across all subdomains.
  // This is essential for the centralised OAuth callback flow where the code is
  // exchanged on platform.* and the user is then redirected to an org subdomain.
  const cookieDomain = hostname.includes(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app')
    ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'}`
    : undefined

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          try {
            return request.cookies.getAll()
          } catch {
            // Corrupted or non-UTF-8 cookie value — treat as no session
            return []
          }
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, cookieDomain ? { ...options, domain: cookieDomain } : options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

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
