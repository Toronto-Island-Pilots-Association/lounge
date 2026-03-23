'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function StripeRefreshPage() {
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org_id')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return

    // Re-generate a fresh account link and redirect
    fetch('/api/platform/stripe/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.url) window.location.href = data.url
        else setError(data.error ?? 'Failed to refresh link')
      })
      .catch(() => setError('Something went wrong'))
  }, [orgId])

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-red-600">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <p className="text-gray-500 text-sm">Refreshing your Stripe setup link…</p>
    </main>
  )
}
