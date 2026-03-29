'use client'

import { useState } from 'react'

export default function StripeDashboardButton({
  orgId,
  label = 'Open Stripe Dashboard',
}: {
  orgId: string
  label?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/integrations`, { method: 'PUT' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to open Stripe Dashboard')
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open Stripe Dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Opening…' : label}
      </button>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    </div>
  )
}
