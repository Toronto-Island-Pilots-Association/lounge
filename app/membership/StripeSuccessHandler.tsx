'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * When the user returns from Stripe Checkout with ?subscription=success&session_id=...,
 * call the confirm API to sync the subscription to the profile, then reload so the UI updates.
 */
export default function StripeSuccessHandler() {
  const searchParams = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    const sessionId = searchParams.get('session_id')
    const success = searchParams.get('subscription') === 'success'
    if (!sessionId || !success) return

    handled.current = true

    const confirm = async () => {
      try {
        const res = await fetch('/api/stripe/confirm-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          console.error('Failed to confirm subscription:', data.error)
        }
      } catch (err) {
        console.error('Failed to confirm subscription:', err)
      }
      // Reload so SubscriptionSection and payment history refetch with updated data
      window.location.replace('/membership')
    }

    confirm()
  }, [searchParams])

  return null
}
