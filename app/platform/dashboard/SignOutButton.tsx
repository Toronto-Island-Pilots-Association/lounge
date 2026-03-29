'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    if (loading) return

    setLoading(true)

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/platform/login')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
