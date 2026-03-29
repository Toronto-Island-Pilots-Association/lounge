'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify, ROOT_DOMAIN } from '@/lib/org'

export default function CreateOrgPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [form, setForm] = useState({ name: '', slug: '' })
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/platform/login')
        return
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [router])

  const handleNameChange = (name: string) => {
    const autoSlug = slugify(name)
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

    const res = await fetch('/api/platform/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: form.name,
        slug: form.slug,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    router.replace(`/platform/dashboard/${data.orgId}/onboarding?created=1`)
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="text-sm text-gray-500">Loading…</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div>
          <Link href="/platform/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Create your lounge</h1>
          <p className="text-sm text-gray-500 mt-1">Create another lounge under your existing account.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Club name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Ottawa Cycling Club"
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
                .{ROOT_DOMAIN}
              </span>
            </div>
            {form.slug.length >= 2 && (
              <p className={`text-xs mt-1 ${slugError ? 'text-red-500' : slugAvailable === true ? 'text-green-600' : slugAvailable === false ? 'text-red-500' : 'text-gray-400'}`}>
                {slugError ?? (slugAvailable === true ? 'Available' : slugAvailable === false ? 'Already taken' : 'Checking...')}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400">
            You can choose a plan, set fees, and connect Stripe in the next step.
          </p>

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
