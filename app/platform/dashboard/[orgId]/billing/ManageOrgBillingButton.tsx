'use client'

import { useState } from 'react'

export default function ManageOrgBillingButton({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/billing-portal`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to open billing portal')
      if (data.url) window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open billing portal')
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
        {loading ? 'Opening…' : 'Manage billing & payment method'}
      </button>
      {error && <div className="text-sm text-red-700">{error}</div>}
    </div>
  )
}
