import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getOrgByHostname, getDomainType } from '@/lib/org'
import { sanitizeAuthCookies } from '@/lib/supabase/sanitize-auth-cookies'

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

  // In local dev, allow ?__domain=marketing|tipa (or any org slug) to simulate domains
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
  requestHeaders.set('x-pathname', pathname)
  if (org) {
    requestHeaders.set('x-org-id', org.id)
    requestHeaders.set('x-org-slug', org.slug)
  }

  // Catch OAuth codes that Supabase delivers to the wrong path (site URL fallback).
  // This happens when redirectTo isn't in Supabase's allowed URL list.
  // Forward to /auth/callback, inferring the right `next` from domain type.
  if (request.nextUrl.searchParams.has('code') && !pathname.startsWith('/auth')) {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    if (!callbackUrl.searchParams.has('next')) {
      if (domainType === 'org') {
        callbackUrl.searchParams.set('next', '/discussions')
      } else if (domainType === 'marketing') {
        // www / apex — /discussions does not exist here (org-only route)
        callbackUrl.searchParams.set('next', '/platform/dashboard')
      }
    }
    return NextResponse.redirect(callbackUrl)
  }

  // Block cross-domain access: org tenants cannot reach /platform or /marketing routes
  if (domainType === 'org' && (pathname.startsWith('/platform') || pathname.startsWith('/marketing'))) {
    return new NextResponse(null, { status: 404 })
  }

  // On the marketing domain, /login is the org member login — redirect to the platform login instead
  if (domainType === 'marketing' && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/platform/login'
    return NextResponse.redirect(url)
  }

  // Root-domain /signup would rewrite to /marketing/signup (no such route) — platform signup creates a new org
  if (domainType === 'marketing' && pathname === '/signup') {
    const url = request.nextUrl.clone()
    url.pathname = '/platform/signup'
    return NextResponse.redirect(url)
  }

  // Rewrite marketing domain to internal /marketing/* prefix.
  // /platform/* and /auth/* paths are served directly without rewriting.
  // clublounge.app/foo          → /marketing/foo
  // clublounge.app/platform/foo → /platform/foo (no rewrite)
  // [org].clublounge.app/foo    → /foo (no rewrite)
  // Don't rewrite API routes — they resolve to their actual paths regardless of domain
  if (!pathname.startsWith('/api')) {
    if (
      domainType === 'marketing' &&
      !pathname.startsWith('/marketing') &&
      !pathname.startsWith('/platform') &&
      !pathname.startsWith('/auth') &&
      !isMarketingAuthExempt
    ) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = `/marketing${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(rewriteUrl, { headers: requestHeaders })
    }
  }

  // Refresh Supabase auth session
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  // Set cookies on the root domain so sessions are shared across all subdomains.
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
            return sanitizeAuthCookies(request.cookies.getAll())
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

  try {
    await supabase.auth.getUser()
  } catch (err) {
    console.error('[proxy] supabase.auth.getUser failed (session cookies may be corrupt):', err)
  }

  response.headers.set('x-domain-type', domainType)
  response.headers.set('x-pathname', pathname)
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
