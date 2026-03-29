'use client'

import { useEffect, useState } from 'react'
import { CnameRecord } from '@/components/platform/CnameRecord'
import { orgStripeDuesUiStatus } from '@/lib/org-stripe-dues-status'
import { buildOrgUrl, ROOT_DOMAIN } from '@/lib/org'

function inputCls() {
  return 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  )
}

function SaveButton({ saving, label = 'Save changes' }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? 'Saving…' : label}
    </button>
  )
}

type OrgIntegrations = {
  billing_activated: boolean
  custom_domain: string | null
  custom_domain_enabled: boolean
  custom_domain_verified: boolean | null
  subdomain: string
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean | null
  stripe_charges_enabled: boolean | null
  stripe_payouts_enabled: boolean | null
}

export default function IntegrationsPageClient({ orgId }: { orgId: string }) {
  const [org, setOrg] = useState<OrgIntegrations | null>(null)
  const [subdomain, setSubdomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeDashboardLoading, setStripeDashboardLoading] = useState(false)
  const [subdomainSaving, setSubdomainSaving] = useState(false)
  const [domainSaving, setDomainSaving] = useState(false)
  const [domainChecking, setDomainChecking] = useState(false)
  const [domainVerification, setDomainVerification] = useState<'verified' | 'pending' | 'invalid' | 'misconfigured' | null>(null)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [subdomainError, setSubdomainError] = useState<string | null>(null)
  const [subdomainSuccess, setSubdomainSuccess] = useState(false)
  const [domainError, setDomainError] = useState<string | null>(null)
  const [domainSuccess, setDomainSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/platform/orgs/${orgId}/settings/integrations`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        if (cancelled) return
        setOrg(d.org)
        setSubdomain(d.org?.subdomain ?? '')
        setCustomDomain(d.org?.custom_domain ?? '')
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgId])

  const connectStripe = async () => {
    setStripeConnecting(true)
    setStripeError(null)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/integrations`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      const { url } = await res.json()
      window.location.href = url
    } catch (e) {
      setStripeError(e instanceof Error ? e.message : 'Failed to connect Stripe')
      setStripeConnecting(false)
    }
  }

  const openStripeDashboard = async () => {
    setStripeDashboardLoading(true)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/integrations`, { method: 'PUT' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      const { url } = await res.json()
      window.open(url, '_blank')
    } catch (e) {
      setStripeError(e instanceof Error ? e.message : 'Failed to open Stripe Dashboard')
    } finally {
      setStripeDashboardLoading(false)
    }
  }

  const checkDomain = async () => {
    setDomainChecking(true)
    setDomainVerification(null)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/integrations?check=domain`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      const { status } = await res.json()
      setDomainVerification(status)
      if (status === 'verified') {
        setOrg(prev => prev ? { ...prev, custom_domain_verified: true } : prev)
      }
    } catch {
      setDomainError('Could not check domain status')
    } finally {
      setDomainChecking(false)
    }
  }

  const saveDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setDomainSaving(true)
    setDomainError(null)
    setDomainSuccess(false)
    setDomainVerification(null)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/integrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      const d = await res.json()
      setOrg(d.org)
      setCustomDomain(d.org?.custom_domain ?? '')
      setDomainSuccess(true)
      setTimeout(() => setDomainSuccess(false), 3000)
    } catch (e) {
      setDomainError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setDomainSaving(false)
    }
  }

  const saveSubdomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubdomainSaving(true)
    setSubdomainError(null)
    setSubdomainSuccess(false)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/integrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      const d = await res.json()
      setOrg(d.org)
      setSubdomain(d.org?.subdomain ?? '')
      setSubdomainSuccess(true)
      setTimeout(() => setSubdomainSuccess(false), 3000)
    } catch (e) {
      setSubdomainError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubdomainSaving(false)
    }
  }

  const stripeUi = org
    ? orgStripeDuesUiStatus(org)
    : 'not_connected'
  const stripePending = stripeUi === 'pending'
  const stripePayoutsPending = stripeUi === 'payments_active_payouts_pending'
  const stripeFullyReady = stripeUi === 'fully_ready'

  if (loading) {
    return (
      <div className="flex py-16 justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-xl">
      <div className="space-y-4">
        <SectionHeader
          title="Member dues (Stripe Connect)"
          description="Accept membership payments through your lounge. Stripe processing fees apply, plus a 2% ClubLounge platform fee on dues payments."
        />

        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              stripeFullyReady
                ? 'bg-green-500'
                : stripePayoutsPending
                  ? 'bg-amber-500'
                  : stripePending
                    ? 'bg-yellow-400'
                    : 'bg-gray-300'
            }`}
          />
          <span className="text-sm text-gray-700">
            {stripeFullyReady
              ? 'Stripe connected — accepting payments'
              : stripePayoutsPending
                ? 'Member payments on — finish Stripe setup for payouts'
                : stripePending
                  ? 'Setup in progress'
                  : 'Not connected'}
          </span>
        </div>

        {!org?.billing_activated ? (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Add billing details before connecting Stripe and collecting dues.
            {' '}
            <a href={`/platform/dashboard/${orgId}/billing`} className="font-medium underline underline-offset-2">
              Open billing
            </a>
            .
          </div>
        ) : stripeFullyReady ? (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            You can collect member dues directly through your lounge, and payouts are enabled on your Stripe account.
          </div>
        ) : stripePayoutsPending ? (
          <div className="space-y-3">
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              Members can pay online. Complete any required information in your Stripe account so payouts can reach your bank.
            </div>
            {stripeError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{stripeError}</div>}
            <button
              type="button"
              onClick={openStripeDashboard}
              disabled={stripeDashboardLoading}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stripeDashboardLoading ? 'Opening…' : 'Open Stripe Dashboard'}
            </button>
          </div>
        ) : (
          <>
            {stripeError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{stripeError}</div>}
            <button
              type="button"
              onClick={connectStripe}
              disabled={stripeConnecting}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stripeConnecting ? 'Redirecting…' : stripePending ? 'Resume Stripe setup' : 'Connect Stripe'}
            </button>
          </>
        )}
      </div>

      <form onSubmit={saveSubdomain} className="space-y-4 pt-6 border-t border-gray-200">
        <SectionHeader
          title="Default subdomain"
          description="Change the default ClubLounge address for your lounge."
        />

        {subdomainError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{subdomainError}</div>}
        {subdomainSuccess && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Saved.</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
          <div className="flex items-center rounded-md border border-gray-300 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900">
            <input
              className="w-full rounded-l-md border-0 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-0"
              placeholder="yourclub"
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase())}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className="shrink-0 rounded-r-md border-l border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500">
              .{ROOT_DOMAIN}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Lowercase letters, numbers, and hyphens only. Your old subdomain stops working after this change.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SaveButton saving={subdomainSaving} label="Save subdomain" />
          {org ? (
            <a
              href={`https://${subdomain || org.subdomain}.${ROOT_DOMAIN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 underline underline-offset-2"
            >
              Visit current subdomain
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : null}
        </div>
      </form>

      <form onSubmit={saveDomain} className="space-y-4 pt-6 border-t border-gray-200">
        <SectionHeader title="Custom domain" description="Serve your member portal on your own domain." />
        {!org?.custom_domain_enabled ? (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Custom domains require the <strong>Growth</strong> plan or higher.
          </div>
        ) : (
          <>
            {domainError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{domainError}</div>}
            {domainSuccess && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Saved.</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input
                className={inputCls()}
                placeholder="lounge.yourclub.com"
                value={customDomain}
                onChange={e => setCustomDomain(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank to use the default subdomain.</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <SaveButton saving={domainSaving} label="Save domain" />
              {org?.custom_domain && (
                <button
                  type="button"
                  onClick={checkDomain}
                  disabled={domainChecking}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {domainChecking ? 'Checking…' : 'Check DNS'}
                </button>
              )}
              {domainVerification === 'verified' && (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Domain verified
                </span>
              )}
              {(domainVerification === 'pending' || domainVerification === 'misconfigured') && (
                <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  DNS not propagated yet
                </span>
              )}
              {domainVerification === 'invalid' && (
                <span className="inline-flex items-center gap-1.5 text-sm text-red-700">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Domain not found — check your settings
                </span>
              )}
            </div>

            {org?.custom_domain && (
              <div className="mt-4 space-y-3">
                <CnameRecord host={org.custom_domain} />
                {org.custom_domain_verified && (
                  <a
                    href={buildOrgUrl(org)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 underline underline-offset-2"
                  >
                    Visit {org.custom_domain}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </form>
    </div>
  )
}
