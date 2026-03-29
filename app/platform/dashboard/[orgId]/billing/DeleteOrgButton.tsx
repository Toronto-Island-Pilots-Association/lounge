'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteOrgButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    if (confirmation !== orgName) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      router.push('/platform/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:text-red-700 underline underline-offset-2"
      >
        Delete this organization
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete organization</h2>
            <p className="text-sm text-gray-600">
              This will permanently delete <strong>{orgName}</strong> and all its data —
              members, events, discussions, payments, and settings. This cannot be undone.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Type <span className="font-bold text-gray-800">{orgName}</span> to confirm
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={orgName}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => { setOpen(false); setConfirmation(''); setError(null) }}
                disabled={loading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmation !== orgName || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
