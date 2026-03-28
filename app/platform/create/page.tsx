'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateOrgPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', slug: '', adminEmail: '', customDomain: '' })
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ url: string; cname: { host: string; value: string } | null } | null>(null)

  const handleNameChange = (name: string) => {
    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setForm(f => ({ ...f, name, slug: autoSlug }))
    if (autoSlug) checkSlug(autoSlug)
  }

  const handleSlugChange = (slug: string) => {
    setForm(f => ({ ...f, slug }))
    setSlugAvailable(null)
    setSlugError(null)
    if (slug.length >= 2) checkSlug(slug)
  }

  const checkSlug = async (slug: string) => {
    const res = await fetch(`/api/orgs?slug=${encodeURIComponent(slug)}`)
    const data = await res.json()
    setSlugAvailable(data.available ?? false)
    setSlugError(data.error ?? null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        adminEmail: form.adminEmail,
        customDomain: form.customDomain || undefined,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    setCreated({ url: data.url, cname: data.cname })
  }

  if (created) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h1 className="text-2xl font-bold">Your lounge is ready</h1>
            <p className="text-gray-600">
              Your club lounge has been created at:
            </p>
            <a
              href={created.url}
              className="block font-mono text-sm bg-gray-50 border rounded-lg px-4 py-3 text-blue-600 hover:underline break-all"
            >
              {created.url}
            </a>

            {created.cname && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  To activate your custom domain, add this DNS record:
                </p>
                <div className="bg-gray-50 border rounded-lg px-4 py-3 font-mono text-sm space-y-1">
                  <div><span className="text-gray-500">Type:</span> CNAME</div>
                  <div><span className="text-gray-500">Host:</span> {created.cname.host}</div>
                  <div><span className="text-gray-500">Value:</span> {created.cname.value}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create your lounge</h1>
          <p className="text-sm text-gray-500 mt-1">Takes about 60 seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Club name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Toronto Island Pilots Association"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Subdomain</label>
            <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
              <input
                type="text"
                value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="myclub"
                required
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
              />
              <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-l select-none">
                .clublounge.app
              </span>
            </div>
            {form.slug.length >= 2 && (
              <p className={`text-xs mt-1 ${slugError ? 'text-red-500' : slugAvailable === true ? 'text-green-600' : slugAvailable === false ? 'text-red-500' : 'text-gray-400'}`}>
                {slugError ?? (slugAvailable === true ? 'Available' : slugAvailable === false ? 'Already taken' : 'Checking...')}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Your email</label>
            <input
              type="email"
              value={form.adminEmail}
              onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
              placeholder="you@yourclub.com"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Custom domain <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.customDomain}
              onChange={e => setForm(f => ({ ...f, customDomain: e.target.value }))}
              placeholder="lounge.myclub.com"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-400">You can set this up later too.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || slugAvailable === false}
            className="w-full bg-black text-white rounded-lg px-6 py-3 font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create lounge'}
          </button>
        </form>
      </div>
    </main>
  )
}
