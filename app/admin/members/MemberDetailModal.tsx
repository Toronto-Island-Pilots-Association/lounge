'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserProfile, MembershipLevel, Payment } from '@/types/database'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'

interface ActivityData {
  stats: {
    threads_created: number
    comments_made: number
    reactions_given: number
    events_created: number
    payments_count: number
    total_paid: number
  }
  threads: Array<{
    id: string
    title: string
    category: string
    created_at: string
    comment_count: number
  }>
  comments: Array<{
    id: string
    content: string
    created_at: string
    thread?: {
      id: string
      title: string
      category: string
    }
  }>
  reactions: Array<{
    id: string
    reaction_type: string
    created_at: string
    thread?: { id: string; title: string }
    comment?: { id: string; content: string }
  }>
  events: Array<{
    id: string
    title: string
    start_time: string
    created_at: string
  }>
  payments: Payment[]
}

export default function MemberDetailModal({
  member,
  onClose,
  onSave,
}: {
  member: UserProfile
  onClose: () => void
  onSave: (member: UserProfile, updates: Partial<UserProfile>) => void
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'membership'>('overview')
  const [formData, setFormData] = useState({
    full_name: member.full_name || '',
    role: member.role,
    membership_level: member.membership_level,
    status: member.status,
    flight_school: member.flight_school || '',
    instructor_name: member.instructor_name || '',
  })
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    paymentMethod: 'cash' as 'cash' | 'paypal' | 'wire',
    membershipExpiresAt: '',
    notes: '',
    clearStripeSubscription: true,
  })
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [loadingActivity, setLoadingActivity] = useState(false)

  useEffect(() => {
    if (activeTab === 'activity' || activeTab === 'membership') {
      loadActivityData()
    }
  }, [activeTab, member.id])

  const loadActivityData = async () => {
    if (activityData) return
    setLoadingActivity(true)
    try {
      const response = await fetch(`/api/admin/members/${member.id}/activity`)
      if (response.ok) {
        const data = await response.json()
        setActivityData(data)
      }
    } catch (error) {
      console.error('Error loading activity data:', error)
    } finally {
      setLoadingActivity(false)
    }
  }

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>{member.full_name || member.email} - Member Details</DrawerTitle>
        </DrawerHeader>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-4">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            {(['overview', 'activity', 'membership'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm capitalize
                  ${
                    activeTab === tab
                      ? 'border-[#0d1e26] text-[#0d1e26]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Profile Information (Read-Only) */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Profile Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <div className="font-medium text-gray-900">{member.email}</div>
                  </div>
                  {member.phone && (
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <div className="font-medium text-gray-900">{member.phone}</div>
                    </div>
                  )}
                  {member.member_number && (
                    <div>
                      <span className="text-gray-500">Member Number:</span>
                      <div className="font-medium text-gray-900">{member.member_number}</div>
                    </div>
                  )}
                  {member.created_at && (
                    <div>
                      <span className="text-gray-500">Member Since:</span>
                      <div className="font-medium text-gray-900">
                        {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Address Information */}
                {(member.street || member.city || member.province_state || member.postal_zip_code || member.country) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Mailing Address</h4>
                    <div className="text-sm text-gray-900">
                      {member.street && <div>{member.street}</div>}
                      {(member.city || member.province_state || member.postal_zip_code) && (
                        <div>
                          {member.city && member.city}
                          {member.city && member.province_state && ', '}
                          {member.province_state}
                          {member.postal_zip_code && ` ${member.postal_zip_code}`}
                        </div>
                      )}
                      {member.country && <div>{member.country}</div>}
                    </div>
                  </div>
                )}

                {/* Aviation Information */}
                {(member.pilot_license_type || member.aircraft_type || member.call_sign || member.how_often_fly_from_ytz) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Aviation Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {member.pilot_license_type && (
                        <div>
                          <span className="text-gray-500">Pilot License Type:</span>
                          <div className="font-medium text-gray-900">{member.pilot_license_type}</div>
                        </div>
                      )}
                      {member.aircraft_type && (
                        <div>
                          <span className="text-gray-500">Aircraft Type:</span>
                          <div className="font-medium text-gray-900">{member.aircraft_type}</div>
                        </div>
                      )}
                      {member.call_sign && (
                        <div>
                          <span className="text-gray-500">Call Sign:</span>
                          <div className="font-medium text-gray-900">{member.call_sign}</div>
                        </div>
                      )}
                      {member.how_often_fly_from_ytz && (
                        <div>
                          <span className="text-gray-500">How Often Fly from YTZ:</span>
                          <div className="font-medium text-gray-900">{member.how_often_fly_from_ytz}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* COPA Membership */}
                {member.is_copa_member && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">COPA Membership</h4>
                    <div className="text-sm">
                      <div className="text-gray-900">
                        <span className="text-gray-500">COPA Member:</span> {member.is_copa_member === 'yes' ? 'Yes' : 'No'}
                      </div>
                      {member.copa_membership_number && (
                        <div className="text-gray-900 mt-1">
                          <span className="text-gray-500">COPA Membership Number:</span> {member.copa_membership_number}
                        </div>
                      )}
                      {member.join_copa_flight_32 && (
                        <div className="text-gray-900 mt-1">
                          <span className="text-gray-500">Join COPA Flight 32:</span> {member.join_copa_flight_32 === 'yes' ? 'Yes' : 'No'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Statement of Interest */}
                {member.statement_of_interest && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Statement of Interest</h4>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">{member.statement_of_interest}</div>
                  </div>
                )}

                {/* How Did You Hear */}
                {member.how_did_you_hear && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">How Did You Hear About Us</h4>
                    <div className="text-sm text-gray-900">{member.how_did_you_hear}</div>
                  </div>
                )}
              </div>

              {/* Editable Fields Section */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Edit Member Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                    />
                  </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as UserProfile['status'] })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Membership Level</label>
                <select
                  value={formData.membership_level}
                  onChange={(e) => setFormData({ ...formData, membership_level: e.target.value as MembershipLevel })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                >
                  <option value="Full">Full</option>
                  <option value="Student">Student</option>
                  <option value="Associate">Associate</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Honorary">Honorary</option>
                </select>
              </div>
              {formData.membership_level === 'Student' && (
                <div className="pt-2 border-t border-gray-200 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flight school / club</label>
                    <input
                      type="text"
                      value={formData.flight_school}
                      onChange={(e) => setFormData({ ...formData, flight_school: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      placeholder="e.g., Island Air, Freelance…"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructor name</label>
                    <input
                      type="text"
                      value={formData.instructor_name}
                      onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      placeholder="e.g., Jane Smith"
                    />
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              {loadingActivity ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0d1e26]"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading activity...</p>
                </div>
              ) : activityData ? (
                <>
                  {/* Statistics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-blue-900">{activityData.stats.threads_created}</div>
                      <div className="text-sm font-medium text-blue-700 mt-1">Threads</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-green-900">{activityData.stats.comments_made}</div>
                      <div className="text-sm font-medium text-green-700 mt-1">Comments</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-purple-900">{activityData.stats.reactions_given}</div>
                      <div className="text-sm font-medium text-purple-700 mt-1">Reactions</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl font-bold text-yellow-900">{activityData.stats.events_created}</div>
                      <div className="text-sm font-medium text-yellow-700 mt-1">Events</div>
                    </div>
                  </div>

                  {/* Recent Threads */}
                  {activityData.threads.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Recent Threads
                      </h3>
                      <div className="space-y-2">
                        {activityData.threads.slice(0, 5).map((thread) => (
                          <Link
                            key={thread.id}
                            href={`/discussions/${thread.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-[#0d1e26] hover:shadow-sm transition-all group"
                          >
                            <div className="font-medium text-sm text-gray-900 group-hover:text-[#0d1e26] line-clamp-2">
                              {thread.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                              <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {thread.comment_count || 0} comments
                              </span>
                              <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Comments */}
                  {activityData.comments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Recent Comments
                      </h3>
                      <div className="space-y-2">
                        {activityData.comments.slice(0, 5).map((comment) => (
                          <Link
                            key={comment.id}
                            href={`/discussions/${comment.thread?.id || '#'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-[#0d1e26] hover:shadow-sm transition-all group"
                          >
                            <div className="text-sm text-gray-900 line-clamp-2 group-hover:text-[#0d1e26]">
                              {comment.content}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                              <span>On: {comment.thread?.title || 'Unknown thread'}</span>
                              <span>•</span>
                              <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                              <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No activity data available</p>
                </div>
              )}
            </div>
          )}

          {/* Membership Tab */}
          {activeTab === 'membership' && (
            <div className="space-y-4">
              {/* Payment Recording Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Payment & Subscription</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Record manual payments (cash, PayPal, or wire transfer)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const defaultExpiresAt = new Date()
                      defaultExpiresAt.setFullYear(defaultExpiresAt.getFullYear() + 1)
                      setPaymentFormData({
                        ...paymentFormData,
                        membershipExpiresAt: defaultExpiresAt.toISOString().split('T')[0],
                      })
                      setShowPaymentForm(!showPaymentForm)
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    {showPaymentForm ? 'Cancel' : 'Record Payment'}
                  </button>
                </div>

                {/* Current Status */}
                <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Status:</span>{' '}
                      <span className="font-medium text-gray-900">{member.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Expires:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {member.membership_expires_at
                          ? new Date(member.membership_expires_at).toLocaleDateString()
                          : 'Not set'}
                      </span>
                    </div>
                    {member.stripe_subscription_id && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Stripe Subscription:</span>{' '}
                        <span className="font-medium text-gray-900">Active</span>
                      </div>
                    )}
                    {member.paypal_subscription_id && (
                      <div className="col-span-2">
                        <span className="text-gray-500">PayPal Subscription:</span>{' '}
                        <span className="font-medium text-gray-900">Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Form */}
                {showPaymentForm && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-3" style={{ overflow: 'visible' }}>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={paymentFormData.paymentMethod}
                        onChange={(e) =>
                          setPaymentFormData({
                            ...paymentFormData,
                            paymentMethod: e.target.value as 'cash' | 'paypal' | 'wire',
                          })
                        }
                        className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      >
                        <option value="cash">Cash</option>
                        <option value="paypal">PayPal</option>
                        <option value="wire">Wire Transfer</option>
                      </select>
                    </div>

                    <div className="relative" style={{ zIndex: 9999, isolation: 'isolate' }}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Membership Expires At
                      </label>
                      <input
                        type="date"
                        value={paymentFormData.membershipExpiresAt}
                        onChange={(e) =>
                          setPaymentFormData({
                            ...paymentFormData,
                            membershipExpiresAt: e.target.value,
                          })
                        }
                        onFocus={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
                        style={{ position: 'relative', pointerEvents: 'auto', WebkitAppearance: 'none' }}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Defaults to 1 year from today if not set
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Notes (optional)
                      </label>
                      <textarea
                        value={paymentFormData.notes}
                        onChange={(e) =>
                          setPaymentFormData({
                            ...paymentFormData,
                            notes: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        placeholder="Payment reference, receipt number, etc."
                      />
                    </div>

                    {member.stripe_subscription_id && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="clearStripe"
                          checked={paymentFormData.clearStripeSubscription}
                          onChange={(e) =>
                            setPaymentFormData({
                              ...paymentFormData,
                              clearStripeSubscription: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-[#0d1e26] focus:ring-[#0d1e26] border-gray-300 rounded"
                        />
                        <label htmlFor="clearStripe" className="ml-2 text-xs text-gray-700">
                          Clear Stripe subscription (recommended for cash/PayPal/wire payments)
                        </label>
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        setRecordingPayment(true)
                        try {
                          const response = await fetch('/api/admin/record-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userId: member.id,
                              paymentMethod: paymentFormData.paymentMethod,
                              membershipExpiresAt: paymentFormData.membershipExpiresAt
                                ? new Date(paymentFormData.membershipExpiresAt).toISOString()
                                : undefined,
                              notes: paymentFormData.notes || undefined,
                              clearStripeSubscription: paymentFormData.clearStripeSubscription,
                            }),
                          })

                          if (response.ok) {
                            const data = await response.json()
                            alert('Payment recorded successfully!')
                            setShowPaymentForm(false)
                            setPaymentFormData({
                              paymentMethod: 'cash',
                              membershipExpiresAt: '',
                              notes: '',
                              clearStripeSubscription: true,
                            })
                            onSave(member, {
                              status: data.member.status,
                              membership_expires_at: data.member.membership_expires_at,
                              stripe_subscription_id: data.member.stripe_subscription_id,
                              stripe_customer_id: data.member.stripe_customer_id,
                              paypal_subscription_id: data.member.paypal_subscription_id,
                            })
                            // Reload activity data to refresh payments
                            setActivityData(null)
                            if (activeTab === 'membership') {
                              loadActivityData()
                            }
                          } else {
                            const error = await response.json()
                            alert(error.error || 'Failed to record payment')
                          }
                        } catch (error) {
                          console.error('Error recording payment:', error)
                          alert('Failed to record payment')
                        } finally {
                          setRecordingPayment(false)
                        }
                      }}
                      disabled={recordingPayment}
                      className="w-full px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {recordingPayment ? 'Recording...' : 'Record Payment'}
                    </button>
                  </div>
                )}
              </div>

              {/* Payment History */}
              {loadingActivity ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0d1e26]"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading payments...</p>
                </div>
              ) : activityData ? (
                <>
                  {activityData.stats.payments_count > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {activityData.payments.map((payment) => (
                              <tr key={payment.id}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(payment.payment_date).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize bg-blue-100 text-blue-800">
                                    {payment.payment_method}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  ${payment.amount.toFixed(2)} {payment.currency}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(payment.membership_expires_at).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                                    payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {payment.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No payment records found</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No payment data available</p>
                </div>
              )}
            </div>
          )}

        </div>
        <DrawerFooter>
          <div className="flex justify-end space-x-2">
            <DrawerClose asChild>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancel
              </button>
            </DrawerClose>
            <button
              onClick={() => {
                onSave(member, {
                  ...formData,
                  is_student_pilot: formData.membership_level === 'Student',
                } as Partial<UserProfile>)
                onClose()
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0d1e26] rounded-md hover:bg-[#0a171c]"
            >
              Save
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
