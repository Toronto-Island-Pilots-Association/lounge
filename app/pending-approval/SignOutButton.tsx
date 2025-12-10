'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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

