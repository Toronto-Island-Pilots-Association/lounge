'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UserProfile, MembershipLevel, getMembershipLevelLabel, Payment } from '@/types/database'
import { isOnTrial, getTrialEndDate } from '@/lib/trial'
import { COUNTRIES, getStatesProvinces } from '@/app/become-a-member/constants'
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
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'membership' | 'activity'>('overview')
  const [formData, setFormData] = useState({
    full_name: member.full_name || '',
    first_name: member.first_name || '',
    last_name: member.last_name || '',
    phone: member.phone || '',
    // Mailing Address
    street: member.street || '',
    city: member.city || '',
    province_state: member.province_state || '',
    postal_zip_code: member.postal_zip_code || '',
    country: member.country || '',
    // Role and Status
    role: member.role,
    membership_level: member.membership_level,
    status: member.status,
    // COPA Membership
    is_copa_member: member.is_copa_member || '',
    join_copa_flight_32: member.join_copa_flight_32 || '',
    copa_membership_number: member.copa_membership_number || '',
    // Aviation Information
    pilot_license_type: member.pilot_license_type || '',
    aircraft_type: member.aircraft_type || '',
    call_sign: member.call_sign || '',
    how_often_fly_from_ytz: member.how_often_fly_from_ytz || '',
    // Student Pilot Fields
    flight_school: member.flight_school || '',
    instructor_name: member.instructor_name || '',
    // Membership Expiration
    membership_expires_at: member.membership_expires_at
      ? new Date(member.membership_expires_at).toISOString().split('T')[0]
      : '',
  })

  // Update formData when member changes
  useEffect(() => {
    setFormData({
      full_name: member.full_name || '',
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      phone: member.phone || '',
      street: member.street || '',
      city: member.city || '',
      province_state: member.province_state || '',
      postal_zip_code: member.postal_zip_code || '',
      country: member.country || '',
      role: member.role,
      membership_level: member.membership_level,
      status: member.status,
      is_copa_member: member.is_copa_member || '',
      join_copa_flight_32: member.join_copa_flight_32 || '',
      copa_membership_number: member.copa_membership_number || '',
      pilot_license_type: member.pilot_license_type || '',
      aircraft_type: member.aircraft_type || '',
      call_sign: member.call_sign || '',
      how_often_fly_from_ytz: member.how_often_fly_from_ytz || '',
      flight_school: member.flight_school || '',
      instructor_name: member.instructor_name || '',
      membership_expires_at: member.membership_expires_at
        ? new Date(member.membership_expires_at).toISOString().split('T')[0]
        : '',
    })
  }, [member])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    paymentMethod: 'cash' as 'cash' | 'paypal' | 'wire',
    amount: '',
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
      <DrawerContent className="max-h-[90vh] flex flex-col md:max-w-4xl">
        <DrawerHeader>
          <DrawerTitle>{member.full_name || member.email} - Member Details</DrawerTitle>
        </DrawerHeader>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-4">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            {(['overview', 'edit', 'membership', 'activity'] as const).map((tab) => (
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
                
                {/* Profile Picture */}
                <div className="mb-4 flex items-center gap-4">
                  {member.profile_picture_url ? (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300">
                      <Image
                        src={member.profile_picture_url}
                        alt={member.full_name || member.email || 'Member'}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <div className="font-medium text-gray-900">{member.email}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-medium text-gray-900">{member.phone || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Member Number:</span>
                    <div className="font-medium text-gray-900">{member.member_number || '-'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Member Since:</span>
                    <div className="font-medium text-gray-900">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">Membership level:</span>
                    <div className="font-medium text-gray-900 mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded ${
                        member.membership_level === 'Full' || member.membership_level === 'Corporate' || member.membership_level === 'Honorary'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.membership_level ? getMembershipLevelLabel(member.membership_level) : 'Full'}
                      </span>
                      {isOnTrial(member.membership_level, member.created_at, member.status) && (
                        <span className="inline-flex px-2 py-0.5 text-xs rounded font-medium bg-blue-100 text-blue-800">
                          Trial
                          {(() => {
                            const trialEnd = getTrialEndDate(member.membership_level, member.created_at)
                            return trialEnd ? ` until ${trialEnd.toLocaleDateString('en-US', { timeZone: 'UTC' })}` : ''
                          })()}
                        </span>
                      )}
                      {member.stripe_subscription_id && (
                        <span className="inline-flex px-2 py-0.5 text-xs rounded font-medium bg-indigo-100 text-indigo-800">
                          Subscribed (Stripe)
                        </span>
                      )}
                      {member.paypal_subscription_id && (
                        <span className="inline-flex px-2 py-0.5 text-xs rounded font-medium bg-sky-100 text-sky-800">
                          Subscribed (PayPal)
                        </span>
                      )}
                      {!member.stripe_subscription_id && !member.paypal_subscription_id && member.status === 'approved' && (
                        <span className="text-xs text-gray-500">No subscription</span>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">Membership status:</span>
                    <div className="font-medium text-gray-900 mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded ${
                        member.status === 'approved' ? 'bg-green-100 text-green-800' :
                        member.status === 'expired' ? 'bg-amber-100 text-amber-800' :
                        member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Pending'}
                      </span>
                      {member.status === 'expired' && member.membership_expires_at && (
                        <span className="text-xs text-amber-700">
                          Expired {new Date(member.membership_expires_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                        </span>
                      )}
                      {member.subscription_cancel_at_period_end && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          Cancellation scheduled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Mailing Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Street:</span>
                      <div className="font-medium text-gray-900">{member.street || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">City:</span>
                      <div className="font-medium text-gray-900">{member.city || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Province/State:</span>
                      <div className="font-medium text-gray-900">{member.province_state || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Postal/ZIP Code:</span>
                      <div className="font-medium text-gray-900">{member.postal_zip_code || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Country:</span>
                      <div className="font-medium text-gray-900">{member.country || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Aviation Information */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Aviation Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Pilot License Type:</span>
                      <div className="font-medium text-gray-900">{member.pilot_license_type || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Aircraft Type:</span>
                      <div className="font-medium text-gray-900">{member.aircraft_type || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Call Sign:</span>
                      <div className="font-medium text-gray-900">{member.call_sign || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">How Often Fly from YTZ:</span>
                      <div className="font-medium text-gray-900">{member.how_often_fly_from_ytz || '-'}</div>
                    </div>
                    {member.is_student_pilot && (
                      <>
                        <div>
                          <span className="text-gray-500">Flight School:</span>
                          <div className="font-medium text-gray-900">{member.flight_school || '-'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Instructor Name:</span>
                          <div className="font-medium text-gray-900">{member.instructor_name || '-'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* COPA Membership */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">COPA Membership</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">COPA Member:</span>
                      <div className="font-medium text-gray-900">
                        {member.is_copa_member === 'yes' ? 'Yes' : member.is_copa_member === 'no' ? 'No' : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Join COPA Flight 32:</span>
                      <div className="font-medium text-gray-900">
                        {member.join_copa_flight_32 === 'yes' ? 'Yes' : member.join_copa_flight_32 === 'no' ? 'No' : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">COPA Membership Number:</span>
                      <div className="font-medium text-gray-900">{member.copa_membership_number || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Interests */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Interests</h4>
                  <div className="text-sm">
                    {(() => {
                      if (!member.interests) {
                        return <span className="text-gray-500">No interests specified</span>
                      }
                      
                      try {
                        const interestsArray = typeof member.interests === 'string' 
                          ? JSON.parse(member.interests) 
                          : member.interests
                        
                        if (!Array.isArray(interestsArray) || interestsArray.length === 0) {
                          return <span className="text-gray-500">No interests specified</span>
                        }

                        const interestLabels: Record<string, string> = {
                          'flying': 'Flying',
                          'aircraft-ownership': 'Aircraft Ownership',
                          'training': 'Training & Education',
                          'safety': 'Safety & Proficiency',
                          'community': 'Community & Networking',
                          'events': 'Events & Social Activities',
                          'advocacy': 'Aviation Advocacy',
                          'island-operations': 'Island Operations / YTZ',
                          'aircraft-maintenance': 'Aircraft Maintenance',
                          'mentoring': 'Mentoring',
                          'hangar-storage': 'Hangar/Storage',
                        }

                        return (
                          <div className="flex flex-wrap gap-2">
                            {interestsArray.map((interest: string) => (
                              <span
                                key={interest}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {interestLabels[interest] || interest}
                              </span>
                            ))}
                          </div>
                        )
                      } catch (error) {
                        return <span className="text-gray-500">Error parsing interests</span>
                      }
                    })()}
                  </div>
                </div>

                {/* Statement of Interest */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Statement of Interest</h4>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {member.statement_of_interest || <span className="text-gray-500">No statement provided</span>}
                  </div>
                </div>

                {/* How Did You Hear */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">How Did You Hear About Us</h4>
                  <div className="text-sm text-gray-900">
                    {member.how_did_you_hear || <span className="text-gray-500">Not specified</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Tab */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Edit Member Details</h3>
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
                        <input
                          type="email"
                          value={member.email}
                          disabled
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">First Name</label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mailing Address */}
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Mailing Address</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Street Address</label>
                      <input
                        type="text"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">City</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Country</label>
                        <select
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value, province_state: '' })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
                        >
                          <option value="">Select Country</option>
                          {COUNTRIES.map((country) => (
                            <option key={country.value} value={country.value}>
                              {country.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Province / State</label>
                        <select
                          value={formData.province_state}
                          onChange={(e) => setFormData({ ...formData, province_state: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
                          disabled={!formData.country}
                        >
                          <option value="">Select Province/State</option>
                          {getStatesProvinces(formData.country).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Postal / ZIP Code</label>
                        <input
                          type="text"
                          value={formData.postal_zip_code}
                          onChange={(e) => setFormData({ ...formData, postal_zip_code: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Membership & Status */}
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Membership & Status</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as UserProfile['status'] })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
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
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
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
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
                        >
                          <option value="Full">Full</option>
                          <option value="Student">Student</option>
                          <option value="Associate">Associate</option>
                          <option value="Corporate">Corporate</option>
                          <option value="Honorary">Honorary</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Membership Expires</label>
                        <input
                          type="date"
                          value={formData.membership_expires_at}
                          onChange={(e) => setFormData({ ...formData, membership_expires_at: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
                          style={{ position: 'relative', zIndex: 1 }}
                        />
                      </div>
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

                  {/* COPA Membership */}
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">COPA Membership</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Are you a COPA Member?</label>
                      <div className="flex gap-6">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="is_copa_member"
                            value="yes"
                            checked={formData.is_copa_member === 'yes'}
                            onChange={(e) => setFormData({ ...formData, is_copa_member: e.target.value })}
                            className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                          />
                          <span className="text-sm text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="is_copa_member"
                            value="no"
                            checked={formData.is_copa_member === 'no'}
                            onChange={(e) => setFormData({ ...formData, is_copa_member: e.target.value, join_copa_flight_32: '', copa_membership_number: '' })}
                            className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                          />
                          <span className="text-sm text-gray-700">No</span>
                        </label>
                      </div>
                    </div>
                    {formData.is_copa_member === 'yes' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Would you like to join COPA Flight 32?</label>
                          <div className="flex gap-6">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="join_copa_flight_32"
                                value="yes"
                                checked={formData.join_copa_flight_32 === 'yes'}
                                onChange={(e) => setFormData({ ...formData, join_copa_flight_32: e.target.value })}
                                className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                              />
                              <span className="text-sm text-gray-700">Yes</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="join_copa_flight_32"
                                value="no"
                                checked={formData.join_copa_flight_32 === 'no'}
                                onChange={(e) => setFormData({ ...formData, join_copa_flight_32: e.target.value, copa_membership_number: '' })}
                                className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                              />
                              <span className="text-sm text-gray-700">No</span>
                            </label>
                          </div>
                        </div>
                        {formData.join_copa_flight_32 === 'yes' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">COPA Membership Number</label>
                            <input
                              type="text"
                              value={formData.copa_membership_number}
                              onChange={(e) => setFormData({ ...formData, copa_membership_number: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                              placeholder="Enter COPA membership number"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Aviation Information */}
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Aviation Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Pilot License Type</label>
                        <select
                          value={formData.pilot_license_type}
                          onChange={(e) => setFormData({ ...formData, pilot_license_type: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
                        >
                          <option value="">Select...</option>
                          <option value="student">Student Pilot</option>
                          <option value="private">Private Pilot</option>
                          <option value="commercial">Commercial Pilot</option>
                          <option value="atp">Airline Transport Pilot</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Aircraft Type</label>
                        <input
                          type="text"
                          value={formData.aircraft_type}
                          onChange={(e) => setFormData({ ...formData, aircraft_type: e.target.value })}
                          placeholder="e.g., Cessna 172, Piper Cherokee"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Call Sign</label>
                        <input
                          type="text"
                          value={formData.call_sign}
                          onChange={(e) => setFormData({ ...formData, call_sign: e.target.value })}
                          placeholder="e.g., C-GABC"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">How Often Fly from YTZ</label>
                        <select
                          value={formData.how_often_fly_from_ytz}
                          onChange={(e) => setFormData({ ...formData, how_often_fly_from_ytz: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
                        >
                          <option value="">Select...</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="occasionally">Occasionally</option>
                          <option value="rarely">Rarely</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => onSave(member, formData)}
                      className="px-4 py-2 bg-[#0d1e26] text-white rounded-md hover:bg-[#0a171c] text-sm font-medium transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
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
                  {/* Chronological Activity Log */}
                  <div>
                    <div className="space-y-0 border-t border-gray-200">
                      {(() => {
                        const formatDate = (dateString: string) => {
                          const date = new Date(dateString)
                          return date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })
                        }

                        // Combine all activities into a single array
                        const allActivities: Array<{
                          type: 'thread' | 'comment' | 'reaction' | 'event'
                          id: string
                          title?: string
                          content?: string
                          created_at: string
                          link?: string
                        }> = []

                        // Add threads
                        activityData.threads.forEach(thread => {
                          allActivities.push({
                            type: 'thread',
                            id: thread.id,
                            title: thread.title,
                            created_at: thread.created_at,
                            link: `/discussions/${thread.id}`
                          })
                        })

                        // Add comments
                        activityData.comments.forEach(comment => {
                          allActivities.push({
                            type: 'comment',
                            id: comment.id,
                            content: comment.content,
                            created_at: comment.created_at,
                            link: `/discussions/${comment.thread?.id || '#'}`
                          })
                        })

                        // Add reactions
                        activityData.reactions.forEach(reaction => {
                          allActivities.push({
                            type: 'reaction',
                            id: reaction.id,
                            title: reaction.thread?.title || reaction.comment?.content?.substring(0, 50) || 'Unknown',
                            created_at: reaction.created_at,
                            link: reaction.thread ? `/discussions/${reaction.thread.id}` : undefined
                          })
                        })

                        // Add events
                        activityData.events.forEach(event => {
                          allActivities.push({
                            type: 'event',
                            id: event.id,
                            title: event.title,
                            created_at: event.created_at,
                            link: `/events`
                          })
                        })

                        // Sort by created_at descending (most recent first)
                        allActivities.sort((a, b) => 
                          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )

                        return allActivities.map((activity) => {
                          const content = activity.title || activity.content || ''
                          
                          const getActivityLabel = () => {
                            switch (activity.type) {
                              case 'thread':
                                return 'Thread'
                              case 'comment':
                                return 'Comment'
                              case 'reaction':
                                return 'Reaction'
                              case 'event':
                                return 'Event'
                            }
                          }

                          const ActivityIcon = () => {
                            switch (activity.type) {
                              case 'thread':
                                return (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                )
                              case 'comment':
                                return (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  </svg>
                                )
                              case 'reaction':
                                return (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                  </svg>
                                )
                              case 'event':
                                return (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                )
                            }
                          }

                          const ActivityContent = activity.link ? (
                            <Link
                              href={activity.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-gray-400">
                                  <ActivityIcon />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase">
                                      {getActivityLabel()}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(activity.created_at)}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-900">
                                    {content}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div className="py-3 border-b border-gray-200 last:border-b-0">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-gray-400">
                                  <ActivityIcon />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase">
                                      {getActivityLabel()}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(activity.created_at)}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-900">
                                    {content}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )

                          return <div key={`${activity.type}-${activity.id}`}>{ActivityContent}</div>
                        })
                      })()}
                    </div>
                  </div>
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
                        className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] cursor-pointer"
                      >
                        <option value="cash">Cash</option>
                        <option value="paypal">PayPal</option>
                        <option value="wire">Wire Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Amount (CAD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentFormData.amount}
                        onChange={(e) =>
                          setPaymentFormData({
                            ...paymentFormData,
                            amount: e.target.value,
                          })
                        }
                        placeholder={
                          member.membership_level === 'Corporate'
                            ? '120'
                            : member.membership_level === 'Full'
                            ? '45'
                            : ''
                        }
                        className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {member.membership_level === 'Corporate'
                          ? 'Default: $120'
                          : member.membership_level === 'Full'
                          ? 'Default: $45'
                          : 'Enter payment amount'}
                      </p>
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
                              amount: paymentFormData.amount ? parseFloat(paymentFormData.amount) : undefined,
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
                              amount: '',
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
                            {activityData.payments.map((payment) => {
                              const stripeSubscriptionUrl = payment.payment_method === 'stripe' && payment.stripe_subscription_id
                                ? `https://dashboard.stripe.com/subscriptions/${payment.stripe_subscription_id}`
                                : null
                              const stripePaymentUrl = payment.payment_method === 'stripe' && payment.stripe_payment_intent_id
                                ? `https://dashboard.stripe.com/payments/${payment.stripe_payment_intent_id}`
                                : null
                              const stripeUrl = stripeSubscriptionUrl || stripePaymentUrl
                              return (
                              <tr key={payment.id}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(payment.payment_date).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {stripeUrl ? (
                                    <a
                                      href={stripeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize bg-blue-100 text-blue-800 hover:bg-blue-200 hover:underline"
                                    >
                                      {payment.payment_method}
                                      <span className="text-blue-600">↗</span>
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize bg-blue-100 text-blue-800">
                                      {payment.payment_method}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  ${payment.amount.toFixed(2)} {payment.currency}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(payment.membership_expires_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}
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
                            )})}
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
