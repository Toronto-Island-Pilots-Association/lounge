'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem =
  | { label: string; href: string; external?: false }
  | { label: string; href: string; external: true }

type NavGroup = { label: string; items: NavItem[] }

/**
 * Membership, signup, and email templates are edited on the lounge hostname — those APIs
 * resolve org from `x-org-id` (subdomain). Platform dashboard links there with `?tab=`.
 */
export default function PlatformSideNav({
  orgId,
  loungeAdminSettingsUrl,
}: {
  orgId: string
  loungeAdminSettingsUrl: string
}) {
  const pathname = usePathname()
  const base = `/platform/dashboard/${orgId}`

  const groups: NavGroup[] = [
    {
      label: 'Configure',
      items: [
        { label: 'General', href: `${base}/settings/general` },
        { label: 'Membership', href: `${loungeAdminSettingsUrl}?tab=Membership`, external: true },
        { label: 'Features', href: `${base}/settings/features` },
        { label: 'Signup form', href: `${loungeAdminSettingsUrl}?tab=Signup`, external: true },
        { label: 'Emails', href: `${loungeAdminSettingsUrl}?tab=Emails`, external: true },
      ],
    },
    {
      label: 'Business',
      items: [
        { label: 'Billing & plan', href: `${base}/billing` },
        { label: 'Integrations', href: `${base}/integrations` },
      ],
    },
  ]

  return (
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
              const className = `flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
              return (
                <li key={`${item.label}-${item.href}`}>
                  {item.external ? (
                    <a href={item.href} className={className}>
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className={className}>
                      {item.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
