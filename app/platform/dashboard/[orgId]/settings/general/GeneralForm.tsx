'use client'

import { useState } from 'react'
import type { OrgIdentity } from '@/lib/settings'

function inputCls() {
  return 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-0'
}

function fileInputCls() {
  return 'block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-900 hover:file:bg-gray-200'
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = await res.json()
    if (j && typeof j.error === 'string') return j.error
  } catch {
    /* ignore */
  }
  return 'Something went wrong'
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
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  const set = (k: keyof OrgIdentity) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(p => ({ ...p, [k]: e.target.value }))

  const brandingBase = `/api/platform/orgs/${orgId}/settings/branding-asset`

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingLogo(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('kind', 'logo')
      const res = await fetch(brandingBase, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await parseError(res))
      const data = (await res.json()) as { url?: string }
      if (data.url) setLogoUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleFaviconFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingFavicon(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('kind', 'favicon')
      const res = await fetch(brandingBase, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await parseError(res))
      const data = (await res.json()) as { url?: string }
      if (data.url) setFaviconUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Favicon upload failed')
    } finally {
      setUploadingFavicon(false)
    }
  }

  const handleRemoveLogo = async () => {
    setError(null)
    try {
      const res = await fetch(`${brandingBase}?kind=logo`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await parseError(res))
      setLogoUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove logo')
    }
  }

  const handleRemoveFavicon = async () => {
    setError(null)
    try {
      const res = await fetch(`${brandingBase}?kind=favicon`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await parseError(res))
      setFaviconUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove favicon')
    }
  }

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
        <span className="block text-sm font-medium text-gray-700 mb-1.5">Lounge logo</span>
        <div className="flex flex-wrap items-start gap-4">
          {logoUrl ? (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote org branding URL */}
              <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 text-center px-1">
              No logo
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,.svg"
              className={fileInputCls()}
              disabled={uploadingLogo}
              onChange={handleLogoFile}
            />
            <div className="flex flex-wrap gap-2">
              {logoUrl ? (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="text-sm text-gray-600 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Remove logo
                </button>
              ) : null}
            </div>
            <p className="text-xs text-gray-400">
              {uploadingLogo ? 'Uploading…' : 'Navbar and membership card. Square or wide PNG or SVG works best (max 5MB).'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1.5">Favicon (optional)</span>
        <div className="flex flex-wrap items-start gap-4">
          {faviconUrl ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={faviconUrl} alt="" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400 text-center leading-tight px-0.5">
              Tab icon
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,.svg,.ico,image/x-icon"
              className={fileInputCls()}
              disabled={uploadingFavicon}
              onChange={handleFaviconFile}
            />
            {faviconUrl ? (
              <button
                type="button"
                onClick={handleRemoveFavicon}
                disabled={uploadingFavicon}
                className="text-sm text-gray-600 underline-offset-2 hover:underline disabled:opacity-50"
              >
                Remove favicon
              </button>
            ) : null}
            <p className="text-xs text-gray-400">
              {uploadingFavicon
                ? 'Uploading…'
                : 'Browser tab icon. If empty, the lounge logo is used. Prefer a small square image (about 32×32). PNG, ICO, or SVG (max 5MB).'}
            </p>
          </div>
        </div>
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
