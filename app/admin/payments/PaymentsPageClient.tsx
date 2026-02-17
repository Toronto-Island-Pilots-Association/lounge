'use client'

import { useEffect, useState } from 'react'
import { Payment, PaymentMethod } from '@/types/database'
import Loading from '@/components/Loading'

interface PaymentWithUser extends Omit<Payment, 'user' | 'recorded_by_user'> {
  user?: {
    id: string
    email: string
    full_name: string | null
    member_number: string | null
  }
  recorded_by_user?: {
    id: string
    email: string
    full_name: string | null
  }
}

export default function PaymentsPageClient() {
  const [payments, setPayments] = useState<PaymentWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    paymentMethod: '' as PaymentMethod | '',
    search: '',
  })
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 100,
    offset: 0,
    hasMore: false,
  })

  const loadPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.paymentMethod) {
        params.append('paymentMethod', filters.paymentMethod)
      }
      params.append('limit', pagination.limit.toString())
      params.append('offset', pagination.offset.toString())

      const response = await fetch(`/api/admin/payments?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          hasMore: data.pagination?.hasMore || false,
        }))
      }
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Reset offset when filter changes
    if (pagination.offset !== 0) {
      setPagination(prev => ({ ...prev, offset: 0 }))
    } else {
      loadPayments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.paymentMethod])

  useEffect(() => {
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.offset])

  const filteredPayments = payments.filter((payment) => {
    if (!filters.search) return true
    
    const searchLower = filters.search.toLowerCase()
    return (
      payment.user?.email?.toLowerCase().includes(searchLower) ||
      payment.user?.full_name?.toLowerCase().includes(searchLower) ||
      payment.user?.member_number?.toLowerCase().includes(searchLower) ||
      payment.id.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return <Loading message="Loading payment history..." />
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="paymentMethod"
            value={filters.paymentMethod}
            onChange={(e) =>
              setFilters({ ...filters, paymentMethod: e.target.value as PaymentMethod | '' })
            }
            className="h-8 text-sm px-2.5 border border-gray-300 rounded text-gray-900 focus:ring-1 focus:ring-[#0d1e26] focus:border-[#0d1e26] w-full sm:w-auto sm:min-w-[110px]"
          >
            <option value="">All methods</option>
            <option value="stripe">Stripe</option>
            <option value="cash">Cash</option>
            <option value="wire">Wire</option>
          </select>
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search..."
            className="h-8 text-sm px-2.5 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-[#0d1e26] focus:border-[#0d1e26] w-full sm:w-36 min-w-0"
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">No payments found.</div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {payment.user?.full_name || '-'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{payment.user?.email}</div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 shrink-0">
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
                    <span>{formatDate(payment.payment_date)}</span>
                    <span className="inline-flex px-1.5 py-0.5 rounded capitalize bg-blue-50 text-blue-800">
                      {payment.payment_method}
                    </span>
                    <span>Expires {formatDate(payment.membership_expires_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[140px]">
                            {payment.user?.full_name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[140px]">
                            {payment.user?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize bg-blue-100 text-blue-800">
                          {payment.payment_method}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.membership_expires_at)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
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
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {payment.recorded_by_user?.full_name || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-b-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => {
                if (pagination.offset > 0) {
                  setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))
                }
              }}
              disabled={pagination.offset === 0}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => {
                if (pagination.hasMore) {
                  setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))
                }
              }}
              disabled={!pagination.hasMore}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{pagination.offset + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.offset + pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => {
                    if (pagination.offset > 0) {
                      setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))
                    }
                  }}
                  disabled={pagination.offset === 0}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (pagination.hasMore) {
                      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))
                    }
                  }}
                  disabled={!pagination.hasMore}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
