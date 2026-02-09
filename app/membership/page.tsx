'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, Payment, getMembershipLevelLabel } from '@/types/database'
import Loading from '@/components/Loading'
import SubscriptionSection from '@/components/SubscriptionSection'

export default function MembershipPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
    loadPayments()
    checkStripeStatus()
  }, [])

  const checkStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe/status')
      if (response.ok) {
        const data = await response.json()
        setStripeEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error)
      setStripeEnabled(false)
    }
  }

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return <Loading message="Loading membership information..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Membership</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your membership and view payment history
          </p>
        </div>

        <div className="space-y-6">
          {/* Membership Information (Read-Only) - Hidden for rejected/expired members */}
          {profile?.status !== 'rejected' && profile?.status !== 'expired' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Membership Information</h2>
                <p className="mt-1 text-sm text-gray-500">Your membership details</p>
              </div>
              <div className="px-6 py-5 space-y-6">
                <div>
                  <label htmlFor="membership_level" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Membership Level
                  </label>
                  <input
                    type="text"
                    id="membership_level"
                    value={profile?.membership_level ? getMembershipLevelLabel(profile.membership_level) : 'Not set'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Membership level cannot be changed. Please contact an administrator if you need to update your membership level.
                  </p>
                </div>

                {profile?.member_number && (
                  <div>
                    <label htmlFor="member_number" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Member Number
                    </label>
                    <input
                      type="text"
                      id="member_number"
                      value={profile.member_number}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                )}

                {profile?.membership_expires_at && (
                  <div>
                    <label htmlFor="membership_expires_at" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Membership Expires
                    </label>
                    <input
                      type="text"
                      id="membership_expires_at"
                      value={new Date(profile.membership_expires_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Subscription Section - Only show if Stripe is enabled */}
                {profile && stripeEnabled && (
                  <div className="pt-4 border-t border-gray-200">
                    <SubscriptionSection profile={profile} embedded={true} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
              <p className="mt-1 text-sm text-gray-500">Your membership payment records</p>
            </div>
            <div className="px-6 py-5">
              {loadingPayments ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0d1e26]"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading payments...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No payment records found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expires
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {new Date(payment.payment_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800">
                              {payment.payment_method}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${payment.amount.toFixed(2)} {payment.currency}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {new Date(payment.membership_expires_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                payment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : payment.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : payment.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
