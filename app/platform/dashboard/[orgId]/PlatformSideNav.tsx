'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { label: string; href: string }
type NavGroup = { label: string; items: NavItem[] }

export default function PlatformSideNav({ orgId }: { orgId: string }) {
  const pathname = usePathname()
  const base = `/platform/dashboard/${orgId}`

  const groups: NavGroup[] = [
    {
      label: 'Configure',
      items: [
        { label: 'General',      href: `${base}/settings/general` },
        { label: 'Membership',   href: `${base}/settings/membership` },
        { label: 'Features',     href: `${base}/settings/features` },
        { label: 'Signup form',  href: `${base}/settings/signup` },
        { label: 'Emails',       href: `${base}/settings/emails` },
      ],
    },
    {
      label: 'Business',
      items: [
        { label: 'Billing & plan',  href: `${base}/billing` },
        { label: 'Integrations',    href: `${base}/integrations` },
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
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
