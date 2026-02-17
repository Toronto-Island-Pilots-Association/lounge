'use client'

import { useEffect, useState } from 'react'
import { Payment } from '@/types/database'
import { type MembershipLevel } from '@/types/database'
import Loading from '@/components/Loading'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function MembershipPageClient({
  membershipLevel = 'Full',
}: {
  membershipLevel?: MembershipLevel
}) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null)
  const [membershipFee, setMembershipFee] = useState<number | null>(null)
  const [payProcessing, setPayProcessing] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  useEffect(() => {
    loadPayments()
  }, [])

  useEffect(() => {
    if (showPaymentModal) {
      setPayError(null)
      const check = async () => {
        try {
          const [statusRes, feesRes] = await Promise.all([
            fetch('/api/stripe/status'),
            fetch('/api/settings/membership-fees'),
          ])
          if (statusRes.ok) {
            const d = await statusRes.json()
            setStripeEnabled(d.enabled)
          } else {
            setStripeEnabled(false)
          }
          if (feesRes.ok) {
            const d = await feesRes.json()
            const level = membershipLevel || 'Full'
            setMembershipFee(d.fees?.[level] ?? null)
          }
        } catch {
          setStripeEnabled(false)
        }
      }
      check()
    }
  }, [showPaymentModal, membershipLevel])

  const loadPayments = async () => {
    setLoadingPayments(true)
    try {
      const response = await fetch('/api/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
      }
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Payment History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          </div>
          {loadingPayments ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-[#0d1e26]"></div>
              <p className="mt-2 text-xs text-gray-500">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No payment records found.</p>
            </div>
          ) : (
            <div className="space-y-0 border-t border-gray-200">
              {payments.map((payment) => (
                <div key={payment.id} className="py-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {payment.payment_method} • {payment.status}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pay modal - Stripe only for members */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {stripeEnabled === null ? (
              <div className="flex justify-center py-6">
                <Loading message="Loading..." size="sm" />
              </div>
            ) : !stripeEnabled ? (
              <p className="text-sm text-gray-600">
                Online payment is not available at the moment. Please contact an administrator to pay or renew your membership.
              </p>
            ) : (
              <>
                {payError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                    {payError}
                  </div>
                )}
                {membershipFee != null && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Annual membership</p>
                        <p className="text-xs text-gray-500 mt-0.5">Billed annually</p>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        ${membershipFee.toFixed(2)}
                        <span className="text-sm font-normal text-gray-500">/year</span>
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  You will be redirected to Stripe to pay securely with your card.
                </p>
                <button
                  onClick={async () => {
                    setPayProcessing(true)
                    setPayError(null)
                    try {
                      const res = await fetch('/api/stripe/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error || 'Failed to start payment')
                      if (data.url) window.location.href = data.url
                      else throw new Error('No checkout URL received')
                    } catch (e: unknown) {
                      setPayError(e instanceof Error ? e.message : 'Something went wrong')
                    } finally {
                      setPayProcessing(false)
                    }
                  }}
                  disabled={payProcessing}
                  className="w-full px-4 py-3 bg-[#0d1e26] text-white font-medium rounded-md hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {payProcessing ? 'Redirecting...' : 'Pay with card'}
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
