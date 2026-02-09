'use client'

import { useState, useEffect } from 'react'
import { UserProfile } from '@/types/database'
import Loading from './Loading'

interface SubscriptionSectionProps {
  user?: {
    id: string
    profile: UserProfile
  }
  profile?: UserProfile
  embedded?: boolean // If true, removes outer card styling for embedding in other sections
}

interface SubscriptionData {
  hasSubscription: boolean
  subscription?: {
    id: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    canceledAt: string | null
    amount?: number | null
    currency?: string
  }
}

export default function SubscriptionSection({ user, profile: profileProp, embedded = false }: SubscriptionSectionProps) {
  // Support both user object and profile prop
  const profile = user?.profile || profileProp
  const userId = user?.id || profile?.id

  if (!profile || !userId) {
    return null
  }

  // Don't show subscription section for rejected members
  if (profile.status === 'rejected') {
    return null
  }
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [membershipFee, setMembershipFee] = useState<number | null>(null)
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    checkStripeStatus()
  }, [])

  useEffect(() => {
    if (stripeEnabled === true) {
      loadSubscription()
      loadMembershipFee()
    } else if (stripeEnabled === false) {
      // Stripe not enabled, don't show subscription section
      setLoading(false)
    }
  }, [stripeEnabled])

  const checkStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe/status')
      if (response.ok) {
        const data = await response.json()
        setStripeEnabled(data.enabled)
      } else {
        setStripeEnabled(false)
      }
    } catch {
      setStripeEnabled(false)
    }
  }

  const loadMembershipFee = async () => {
    try {
      const response = await fetch('/api/settings/membership-fee')
      if (response.ok) {
        const data = await response.json()
        setMembershipFee(data.fee)
      }
    } catch (err) {
      console.error('Failed to load membership fee:', err)
    }
  }

  const loadSubscription = async () => {
    try {
      setLoading(true)
      
      // Try to load subscription
      const response = await fetch('/api/stripe/get-subscription')
      
      if (response.ok) {
        const data = await response.json()
        if (data.error && data.error.includes('not configured')) {
          // If not configured, don't show subscription section
          setSubscription({ hasSubscription: false })
          setError(null) // Don't show error, just don't display subscription
        } else {
          setSubscription(data)
        }
      } else {
        const data = await response.json()
        if (data.error && data.error.includes('not configured')) {
          // If not configured, don't show subscription section
          setSubscription({ hasSubscription: false })
          setError(null) // Don't show error, just don't display subscription
        } else {
          setError('Failed to load subscription information')
        }
      }
    } catch (err: any) {
      // On error, don't show subscription
      setSubscription({ hasSubscription: false })
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    try {
      setProcessing(true)
      setError(null)

      // Only allow subscription if Stripe is enabled
      if (!stripeEnabled) {
        setError('Stripe payment processing is not currently available. Please contact support.')
        setProcessing(false)
        return
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start subscription process')
      setProcessing(false)
    }
  }

  const handleCancel = async (cancelImmediately: boolean = false) => {
    if (!confirm(
      cancelImmediately
        ? 'Are you sure you want to cancel your subscription immediately? You will lose access right away.'
        : 'Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.'
    )) {
      return
    }

    try {
      setProcessing(true)
      setError(null)

      // Only allow cancellation if Stripe is enabled
      if (!stripeEnabled) {
        setError('Stripe payment processing is not currently available.')
        setProcessing(false)
        return
      }

      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelImmediately }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      // Reload subscription data
      await loadSubscription()
      alert(data.message || 'Subscription cancelled successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800',
      unpaid: 'bg-red-100 text-red-800',
    }

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${
          statusColors[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    )
  }

  // Don't show subscription section if Stripe is not enabled
  if (stripeEnabled === false) {
    return null
  }

  if (loading || stripeEnabled === null) {
    return (
      <div className={embedded ? "p-0" : "bg-white shadow rounded-lg p-6"}>
        <Loading message="Loading subscription information..." size="sm" />
      </div>
    )
  }

  if (embedded) {
    // Embedded version - no outer card, just content
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Membership Subscription</h3>
        <div>
        {error && (
          <div className="mb-4 rounded-md p-4 bg-red-50">
            <div className="text-sm text-red-800">
              {error}
            </div>
          </div>
        )}

        {!subscription?.hasSubscription ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                You don't have an active subscription. Subscribe to maintain your membership and access all TIPA features.
              </p>
              {membershipFee && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Annual Membership</p>
                      <p className="text-xs text-gray-500 mt-1">Billed annually</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      ${membershipFee.toFixed(2)}
                      <span className="text-sm font-normal text-gray-500">/year</span>
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={handleSubscribe}
                disabled={processing}
                className="w-full px-4 py-2 bg-[#0d1e26] text-white font-semibold rounded-md hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Subscription Status</p>
                <div className="mt-1">{getStatusBadge(subscription.subscription!.status)}</div>
              </div>
              {subscription.subscription!.status === 'active' && (
                <button
                  onClick={() => handleCancel(false)}
                  disabled={processing || subscription.subscription!.cancelAtPeriodEnd}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {subscription.subscription!.cancelAtPeriodEnd
                    ? 'Cancellation Scheduled'
                    : 'Cancel Subscription'}
                </button>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              {subscription.subscription!.amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Membership Fee Paid:</span>
                  <span className="text-gray-900 font-medium">
                    ${subscription.subscription!.amount.toFixed(2)} {subscription.subscription!.currency?.toUpperCase() || 'CAD'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Period Start:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(subscription.subscription!.currentPeriodStart)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Period End:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(subscription.subscription!.currentPeriodEnd)}
                </span>
              </div>
              {subscription.subscription!.cancelAtPeriodEnd && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Your subscription will be cancelled at the end of the current billing period (
                    {formatDate(subscription.subscription!.currentPeriodEnd)}). You will continue to have access until then.
                  </p>
                </div>
              )}
            </div>

            {subscription.subscription!.status === 'active' && !subscription.subscription!.cancelAtPeriodEnd && profile.stripe_customer_id && (
              <div className="pt-4 border-t border-gray-200">
                <a
                  href={`https://billing.stripe.com/p/login/${profile.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0d1e26] hover:text-[#0a171c] font-medium"
                >
                  Manage billing &rarr;
                </a>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    )
  }

  // Standalone version - with card styling
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Membership Subscription</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your membership payment and subscription</p>
      </div>
      <div className="px-6 py-5">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">
              {error}
            </div>
          </div>
        )}

        {!subscription?.hasSubscription ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                You don't have an active subscription. Subscribe to maintain your membership and access all TIPA features.
              </p>
              {membershipFee && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Annual Membership</p>
                      <p className="text-xs text-gray-500 mt-1">Billed annually</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      ${membershipFee.toFixed(2)}
                      <span className="text-sm font-normal text-gray-500">/year</span>
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={handleSubscribe}
                disabled={processing}
                className="w-full px-4 py-2 bg-[#0d1e26] text-white font-semibold rounded-md hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Subscription Status</p>
                <div className="mt-1">{getStatusBadge(subscription.subscription!.status)}</div>
              </div>
              {subscription.subscription!.status === 'active' && (
                <button
                  onClick={() => handleCancel(false)}
                  disabled={processing || subscription.subscription!.cancelAtPeriodEnd}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {subscription.subscription!.cancelAtPeriodEnd
                    ? 'Cancellation Scheduled'
                    : 'Cancel Subscription'}
                </button>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              {subscription.subscription!.amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Membership Fee Paid:</span>
                  <span className="text-gray-900 font-medium">
                    ${subscription.subscription!.amount.toFixed(2)} {subscription.subscription!.currency?.toUpperCase() || 'CAD'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Period Start:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(subscription.subscription!.currentPeriodStart)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Period End:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(subscription.subscription!.currentPeriodEnd)}
                </span>
              </div>
              {subscription.subscription!.cancelAtPeriodEnd && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Your subscription will be cancelled at the end of the current billing period (
                    {formatDate(subscription.subscription!.currentPeriodEnd)}). You will continue to have access until then.
                  </p>
                </div>
              )}
            </div>

            {subscription.subscription!.status === 'active' && !subscription.subscription!.cancelAtPeriodEnd && profile.stripe_customer_id && (
              <div className="pt-4 border-t border-gray-200">
                <a
                  href={`https://billing.stripe.com/p/login/${profile.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0d1e26] hover:text-[#0a171c] font-medium"
                >
                  Manage billing &rarr;
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
