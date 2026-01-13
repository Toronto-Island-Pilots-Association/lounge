'use client'

import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
      // Still redirect even if logout fails
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full bg-[#0d1e26] text-white py-2 px-4 rounded-md hover:bg-[#0a171c] transition-colors"
    >
      Sign Out
    </button>
  )
}

