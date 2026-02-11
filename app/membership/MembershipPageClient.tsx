'use client'

import { useEffect, useState } from 'react'
import { Payment } from '@/types/database'
import Loading from '@/components/Loading'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function MembershipPageClient() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const paymentEmail = 'tbd'

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(paymentEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-[#0d1e26] text-white rounded-md hover:bg-[#0a171c] text-sm font-medium transition-colors"
            >
              Pay
            </button>
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

      {/* Payment Options Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <a
              href="https://www.paypal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-md border border-gray-200 hover:border-[#0d1e26] hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">PayPal</div>
                <div className="text-xs text-gray-500">Pay online</div>
              </div>
            </a>
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 mb-2">E-Transfer/Interac</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 font-mono">
                      {paymentEmail}
                    </div>
                    <button
                      onClick={copyEmail}
                      className="px-3 py-1.5 bg-[#0d1e26] text-white rounded text-sm font-medium hover:bg-[#0a171c] transition-colors flex items-center gap-1.5"
                    >
                      {copiedEmail ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md border border-gray-200">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">Cash</div>
                <div className="text-xs text-gray-500">In person</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
