'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <Link
                href="/admin/members"
                className={`py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  isActive('/admin/members')
                    ? 'border-[#0d1e26] text-[#0d1e26]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Members
              </Link>
              <Link
                href="/admin/resources"
                className={`py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  isActive('/admin/resources')
                    ? 'border-[#0d1e26] text-[#0d1e26]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                YTZ Flying Updates
              </Link>
              <Link
                href="/admin/events"
                className={`py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  isActive('/admin/events')
                    ? 'border-[#0d1e26] text-[#0d1e26]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Events
              </Link>
              <Link
                href="/admin/settings"
                className={`py-3 px-4 sm:py-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  isActive('/admin/settings')
                    ? 'border-[#0d1e26] text-[#0d1e26]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
