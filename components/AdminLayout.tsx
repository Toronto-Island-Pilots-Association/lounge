'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  FileText,
  Calendar,
  CreditCard,
  BarChart3,
  BookOpen,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/resources', label: 'Announcements', icon: FileText },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/pages', label: 'Pages', icon: BookOpen },
] as const

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-[var(--color-primary)] text-white font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - matches Hangar Talk spacing (mb-6) */}
        <div className="mb-6 lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin</h1>
          <nav
            className="mt-3 flex overflow-x-auto overscroll-x-contain gap-1.5 pb-1 -mx-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex-shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium flex items-center justify-center whitespace-nowrap transition-colors ${
                  isActive(href)
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Main content: narrow fixed sidebar + flexible content */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar - hidden on mobile, narrow fixed width */}
          <div className="hidden lg:block lg:w-52 lg:shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Admin
              </h3>
              <nav className="space-y-1">
                {NAV_ITEMS.map(({ href, label, icon }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    icon={icon}
                    isActive={isActive(href)}
                  />
                ))}
              </nav>
            </div>
          </div>

          {/* Main content - takes remaining space */}
          <div className="min-w-0 flex-1">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
