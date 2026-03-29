'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify, ROOT_DOMAIN } from '@/lib/org'
import { GoogleButton } from '@/components/platform/GoogleButton'
import { PLAN_KEYS, PLANS, type PlanKey } from '@/lib/plans'

type Step = 1 | 2

interface AccountForm {
  firstName: string
  lastName: string
  email: string
  password: string
}

interface ClubForm {
  name: string
  slug: string
}

function getSelectedPlan(value: string | null): PlanKey {
  return value && PLAN_KEYS.includes(value as PlanKey) ? (value as PlanKey) : 'hobby'
}

export default function PlatformSignup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPlan = getSelectedPlan(searchParams.get('plan'))
  const selectedPlanLabel = PLANS[selectedPlan].label
  const [checkingSession, setCheckingSession] = useState(true)
  const [step, setStep] = useState<Step>(1)
  const [account, setAccount] = useState<AccountForm>({ firstName: '', lastName: '', email: '', password: '' })
  const [club, setClub] = useState<ClubForm>({ name: '', slug: '' })
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const email = searchParams.get('email')
    if (email) setAccount(a => ({ ...a, email }))
  }, [searchParams])

  useEffect(() => {
    const loadExistingSession = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          router.replace(`/platform/create?plan=${selectedPlan}`)
          return
        }
      } catch {
        // no-op
      } finally {
        setCheckingSession(false)
      }
    }

    loadExistingSession()
  }, [router, selectedPlan])

  const checkSlug = async (slug: string) => {
    setSlugAvailable(null)
    setSlugError(null)
    if (slug.length < 2) return
    const res = await fetch(`/api/orgs?slug=${encodeURIComponent(slug)}`)
    const data = await res.json()
    setSlugAvailable(data.available ?? false)
    setSlugError(data.error ?? null)
  }

  const handleNameChange = (name: string) => {
    const autoSlug = slugify(name)
    setClub(c => ({ ...c, name, slug: autoSlug }))
    if (autoSlug.length >= 2) checkSlug(autoSlug)
  }

  const handleStep1 = () => {
    if (!account.firstName || !account.email || !account.password) {
      setError('Please fill in all required fields')
      return
    }
    if (account.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    const body: any = {
      firstName: account.firstName,
      lastName: account.lastName || undefined,
      orgName: club.name,
      slug: club.slug,
    }

    if (account.email && account.password) {
      body.email = account.email
      body.password = account.password
    }

    const res = await fetch('/api/platform/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      setLoading(false)
      setError(data.error ?? 'Something went wrong')
      return
    }

    const supabase = createClient()
    await supabase.auth.signInWithPassword({ email: account.email, password: account.password })

    setLoading(false)
    router.replace(`/platform/dashboard/${data.orgId}/onboarding?created=1&plan=${selectedPlan}`)
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
      <div className="max-w-md w-full space-y-5">
        <div>
          <Link href="/platform" className="text-sm text-gray-500 hover:text-gray-700">← ClubLounge</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Create your lounge</h1>

          <div className="flex items-center gap-1.5 mt-3">
            {(['Your account', 'Club setup'] as const).map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <div className="h-px w-5 bg-gray-200" />}
                <div className={`flex items-center gap-1.5 text-sm ${step === i + 1 ? 'text-black font-medium' : step > i + 1 ? 'text-gray-400' : 'text-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === i + 1 ? 'bg-black text-white' :
                    step > i + 1 ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          {step === 1 && (
            <>
              <p className="text-xs text-center text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {selectedPlan === 'hobby'
                  ? 'You selected Hobby. We’ll create your lounge first, then you can add billing during setup.'
                  : `You selected ${selectedPlanLabel}. We’ll create your lounge first, then add billing for ${selectedPlanLabel} during setup.`}
              </p>
              <GoogleButton
                redirectTo="/platform/dashboard"
                className="w-full flex items-center justify-center gap-3 border rounded-lg px-6 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
              />

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">First name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={account.firstName}
                    onChange={e => setAccount(a => ({ ...a, firstName: e.target.value }))}
                    placeholder="Jane"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Last name</label>
                  <input
                    type="text"
                    value={account.lastName}
                    onChange={e => setAccount(a => ({ ...a, lastName: e.target.value }))}
                    placeholder="Smith"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={account.email}
                  onChange={e => setAccount(a => ({ ...a, email: e.target.value }))}
                  placeholder="you@yourclub.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={account.password}
                  onChange={e => setAccount(a => ({ ...a, password: e.target.value }))}
                  placeholder="At least 8 characters"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={handleStep1}
                className="w-full bg-black text-white rounded-lg px-6 py-3 font-medium hover:bg-gray-800 transition-colors"
              >
                Continue
              </button>
              <p className="text-center text-sm text-gray-500">
                Already have a lounge?{' '}
                <Link href="/platform/login" className="text-black font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Club name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={club.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ottawa Cycling Club"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Subdomain <span className="text-red-500">*</span></label>
                <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                  <input
                    type="text"
                    value={club.slug}
                    onChange={e => {
                      setClub(c => ({ ...c, slug: e.target.value }))
                      checkSlug(e.target.value)
                    }}
                    placeholder="myclub"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  />
                  <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-l select-none">.{ROOT_DOMAIN}</span>
                </div>
                {club.slug.length >= 2 && (
                  <p className={`text-xs mt-1 ${slugError ? 'text-red-500' : slugAvailable === true ? 'text-green-600' : slugAvailable === false ? 'text-red-500' : 'text-gray-400'}`}>
                    {slugError ?? (slugAvailable === true ? 'Available' : slugAvailable === false ? 'Already taken' : 'Checking...')}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400">
                After creation, you&apos;ll set membership fees, choose a plan, and connect Stripe from one onboarding flow.
              </p>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => { setError(null); setStep(1) }}
                  className="flex-1 border rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !club.name || !club.slug || slugAvailable === false}
                  className="flex-1 bg-black text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating…' : 'Create lounge'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
