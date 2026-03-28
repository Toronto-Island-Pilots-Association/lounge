'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem =
  | { label: string; href: string; external?: false }
  | { label: string; href: string; external: true }

type NavGroup = { label: string; items: NavItem[] }

export default function PlatformMobileHeader({
  orgId,
  orgName,
  planLabel,
  trialActive,
  orgUrl,
}: {
  orgId: string
  orgName: string
  planLabel: string
  trialActive: boolean
  orgUrl: string
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const base = `/platform/dashboard/${orgId}`

  const groups: NavGroup[] = [
    {
      label: 'Configure',
      items: [
        { label: 'General', href: `${base}/settings/general` },
        { label: 'Membership', href: `${base}/settings/membership` },
        { label: 'Features', href: `${base}/settings/features` },
        { label: 'Discussions', href: `${base}/settings/discussions` },
        { label: 'Signup form', href: `${base}/settings/signup` },
        { label: 'Integrations', href: `${base}/settings/integrations` },
      ],
    },
    {
      label: 'Business',
      items: [{ label: 'Billing & plan', href: `${base}/billing` }],
    },
  ]

  return (
    <div className="md:hidden w-full min-w-0 shrink-0">
      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 pb-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/platform/dashboard"
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="All lounges"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{orgName}</span>
          <span className="hidden shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs capitalize text-gray-500 sm:inline">
            {planLabel}
          </span>
          {trialActive && (
            <span className="hidden shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 sm:inline">
              Trial
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-md p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,100vw)] max-w-full flex-col bg-white transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer header */}
        <div
          className="flex items-start justify-between border-b border-gray-100 px-4 pb-4"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
        >
          <div className="space-y-1">
            <Link
              href="/platform/dashboard"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All lounges
            </Link>
            <p className="font-semibold text-sm text-gray-900 truncate">{orgName}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">{planLabel}</span>
              {trialActive && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Trial</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const active =
                    !item.external &&
                    (pathname === item.href || pathname.startsWith(item.href + '/'))
                  const cls = `flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                  return (
                    <li key={`${item.label}-${item.href}`}>
                      {item.external ? (
                        <a href={item.href} className={cls}>{item.label}</a>
                      ) : (
                        <Link href={item.href} className={cls}>{item.label}</Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="border-t border-gray-100 px-4 pt-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <a
            href={orgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-800"
          >
            Visit lounge
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
