'use client'

import { useState } from 'react'
import type { OrgIdentity } from '@/lib/settings'

function inputCls() {
  return 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-0'
}

export default function GeneralForm({
  initial,
  initialLogoUrl,
  initialFaviconUrl,
  orgId,
}: {
  initial: OrgIdentity
  initialLogoUrl: string
  initialFaviconUrl: string
  orgId: string
}) {
  const [draft, setDraft] = useState<OrgIdentity>(initial)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [faviconUrl, setFaviconUrl] = useState(initialFaviconUrl)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const set = (k: keyof OrgIdentity) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/general`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, logoUrl, faviconUrl }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save')
      const data = await res.json()
      setDraft(data.identity)
      setLogoUrl(data.logoUrl ?? '')
      setFaviconUrl(data.faviconUrl ?? '')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error   && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Saved.</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Display name</label>
        <input className={inputCls()} placeholder="e.g. TIPA" value={draft.displayName} onChange={set('displayName')} />
        <p className="text-xs text-gray-400 mt-1">Short name shown throughout the member portal and browser title.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Lounge logo URL</label>
        <input
          type="url"
          className={inputCls()}
          placeholder="https://…"
          value={logoUrl}
          onChange={e => setLogoUrl(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">
          Navbar and membership card. Square or wide PNG/SVG from your storage (e.g. Supabase) works best.
          Leave empty to clear.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Favicon URL (optional)</label>
        <input
          type="url"
          className={inputCls()}
          placeholder="https://… (square .ico or PNG)"
          value={faviconUrl}
          onChange={e => setFaviconUrl(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">
          Browser tab icon. If empty, the lounge logo is used. Use a small square image (e.g. 32×32).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea className={inputCls()} rows={3} placeholder="One-line description shown on the welcome page." value={draft.description} onChange={set('description')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact email</label>
          <input type="email" className={inputCls()} placeholder="info@yourclub.com" value={draft.contactEmail} onChange={set('contactEmail')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
          <input type="url" className={inputCls()} placeholder="https://yourclub.com" value={draft.websiteUrl} onChange={set('websiteUrl')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Accent colour</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-9 w-12 cursor-pointer rounded border border-gray-200 p-0.5"
              value={draft.accentColor}
              onChange={set('accentColor')}
            />
            <input
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm font-mono text-gray-900 focus:border-gray-400 focus:outline-none"
              value={draft.accentColor}
              onChange={set('accentColor')}
              placeholder="#0d1e26"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
          <input className={inputCls()} placeholder="America/Toronto" value={draft.timezone} onChange={set('timezone')} />
          <p className="text-xs text-gray-400 mt-1">IANA format, e.g. America/Vancouver</p>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
