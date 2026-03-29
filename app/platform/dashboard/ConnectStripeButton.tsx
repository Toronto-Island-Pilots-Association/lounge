'use client'

import { useState } from 'react'

export default function ConnectStripeButton({
  orgId,
  isPending,
  returnTo,
}: {
  orgId: string
  isPending: boolean
  returnTo?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/platform/stripe/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, returnTo }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    window.location.href = data.url
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="bg-[#635BFF] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#4F46E5] transition-colors disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : isPending ? 'Resume Stripe setup' : 'Connect Stripe'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
