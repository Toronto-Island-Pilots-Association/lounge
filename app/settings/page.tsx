'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserProfile } from '@/types/database'
import ProfilePictureUpload from '@/components/ProfilePictureUpload'
import Loading from '@/components/Loading'
import { COUNTRIES, getStatesProvinces } from '@/app/become-a-member/constants'

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    // Mailing Address
    street: '',
    city: '',
    province_state: '',
    postal_zip_code: '',
    country: '',
    // COPA Membership
    is_copa_member: '',
    join_copa_flight_32: '',
    copa_membership_number: '',
    // Statement of Interest
    statement_of_interest: '',
    // Aviation Information
    pilot_license_type: '',
    aircraft_type: '',
    call_sign: '',
    how_often_fly_from_ytz: '',
    how_did_you_hear: '',
    flight_school: '',
    instructor_name: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setFormData({
          full_name: data.profile.full_name || '',
          first_name: data.profile.first_name || '',
          last_name: data.profile.last_name || '',
          phone: data.profile.phone || '',
          street: data.profile.street || '',
          city: data.profile.city || '',
          province_state: data.profile.province_state || '',
          postal_zip_code: data.profile.postal_zip_code || '',
          country: data.profile.country || '',
          is_copa_member: data.profile.is_copa_member || '',
          join_copa_flight_32: data.profile.join_copa_flight_32 || '',
          copa_membership_number: data.profile.copa_membership_number || '',
          statement_of_interest: data.profile.statement_of_interest || '',
          pilot_license_type: data.profile.pilot_license_type || '',
          aircraft_type: data.profile.aircraft_type || '',
          call_sign: data.profile.call_sign || '',
          how_often_fly_from_ytz: data.profile.how_often_fly_from_ytz || '',
          how_did_you_hear: data.profile.how_did_you_hear || '',
          flight_school: data.profile.flight_school || '',
          instructor_name: data.profile.instructor_name || '',
        })
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          // Exclude read-only fields from updates - only admins can update these
          full_name: undefined,
          statement_of_interest: undefined,
          how_did_you_hear: undefined,
          is_student_pilot: formData.pilot_license_type === 'student',
          flight_school: formData.pilot_license_type === 'student' ? formData.flight_school : '',
          instructor_name: formData.pilot_license_type === 'student' ? formData.instructor_name : '',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfile(data.profile)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target
    const isCheckbox = target.type === 'checkbox'
    const value = isCheckbox ? (target as HTMLInputElement).checked : target.value
    const name = target.name

    // For non-checkbox inputs, ensure value is a string
    const stringValue = isCheckbox ? value : String(value)

    // Reset conditional fields when parent field changes
    if (name === 'is_copa_member' && stringValue !== 'yes') {
      setFormData(prev => ({
        ...prev,
        [name]: stringValue as string,
        join_copa_flight_32: '',
        copa_membership_number: '',
      }))
    } else if (name === 'join_copa_flight_32' && stringValue !== 'yes') {
      setFormData(prev => ({
        ...prev,
        [name]: stringValue as string,
        copa_membership_number: '',
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: isCheckbox ? value : stringValue as string,
      }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Loading message="Loading..." />
        </div>
      </div>
    )
  }

  const getMembershipLevelLabel = (value: string | null | undefined) => {
    if (!value) return 'Not set'
    switch (value) {
      case 'Full': return 'Full'
      case 'Student': return 'Student'
      case 'Associate': return 'Associate'
      case 'Corporate': return 'Corporate'
      case 'Honorary': return 'Honorary'
      default: return value
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your profile information and preferences
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Profile updated successfully!</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Profile Picture</h2>
              <p className="mt-1 text-sm text-gray-500">Update your profile picture</p>
            </div>
            <div className="px-6 py-5">
              {profile && (
                <ProfilePictureUpload
                  currentPictureUrl={profile.profile_picture_url}
                  userId={profile.id}
                  onUpdate={loadProfile}
                />
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              <p className="mt-1 text-sm text-gray-500">Your basic contact information</p>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    id="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    id="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mailing Address */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Mailing Address</h2>
              <p className="mt-1 text-sm text-gray-500">Your mailing address information</p>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  name="street"
                  id="street"
                  value={formData.street}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Country
                  </label>
                  <select
                    name="country"
                    id="country"
                    value={formData.country}
                    onChange={(e) => {
                      handleChange(e)
                      // Reset province/state when country changes
                      setFormData(prev => ({
                        ...prev,
                        country: e.target.value,
                        province_state: '',
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="province_state" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Province / State
                  </label>
                  <select
                    name="province_state"
                    id="province_state"
                    value={formData.province_state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  >
                    {getStatesProvinces(formData.country).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="postal_zip_code" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Postal / ZIP Code
                  </label>
                  <input
                    type="text"
                    name="postal_zip_code"
                    id="postal_zip_code"
                    value={formData.postal_zip_code}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  />
                </div>
              </div>
            </div>
          </div>


          {/* COPA Membership */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">COPA Membership</h2>
              <p className="mt-1 text-sm text-gray-500">Your COPA membership information</p>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Are you a COPA Member?
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_copa_member"
                      value="yes"
                      className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                      checked={formData.is_copa_member === 'yes'}
                      onChange={handleChange}
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_copa_member"
                      value="no"
                      className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                      checked={formData.is_copa_member === 'no'}
                      onChange={handleChange}
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>

              {formData.is_copa_member === 'yes' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Would you like to join COPA Flight 32? COPA Flight 32 is free to join and a working partner with TIPA.
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="join_copa_flight_32"
                          value="yes"
                          className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                          checked={formData.join_copa_flight_32 === 'yes'}
                          onChange={handleChange}
                        />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="join_copa_flight_32"
                          value="no"
                          className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                          checked={formData.join_copa_flight_32 === 'no'}
                          onChange={handleChange}
                        />
                        <span className="text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>

                  {formData.join_copa_flight_32 === 'yes' && (
                    <div>
                      <label htmlFor="copa_membership_number" className="block text-sm font-medium text-gray-700 mb-1.5">
                        COPA Membership Number
                      </label>
                      <input
                        type="text"
                        name="copa_membership_number"
                        id="copa_membership_number"
                        value={formData.copa_membership_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                        placeholder="Enter your COPA membership number"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Aviation Information */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Aviation Information</h2>
              <p className="mt-1 text-sm text-gray-500">Your aviation background and experience</p>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="pilot_license_type" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pilot License Type
                  </label>
                  <select
                    name="pilot_license_type"
                    id="pilot_license_type"
                    value={formData.pilot_license_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
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
                  <label htmlFor="aircraft_type" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Aircraft Type
                  </label>
                  <input
                    type="text"
                    name="aircraft_type"
                    id="aircraft_type"
                    value={formData.aircraft_type}
                    onChange={handleChange}
                    placeholder="e.g., Cessna 172, Piper Cherokee"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  />
                </div>

                <div>
                  <label htmlFor="call_sign" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Call Sign
                  </label>
                  <input
                    type="text"
                    name="call_sign"
                    id="call_sign"
                    value={formData.call_sign}
                    onChange={handleChange}
                    placeholder="e.g., C-GABC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  />
                </div>

                <div>
                  <label htmlFor="how_often_fly_from_ytz" className="block text-sm font-medium text-gray-700 mb-1.5">
                    How Often Do You Fly From YTZ?
                  </label>
                  <select
                    name="how_often_fly_from_ytz"
                    id="how_often_fly_from_ytz"
                    value={formData.how_often_fly_from_ytz}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
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

              {/* Student Pilot Fields */}
              {formData.pilot_license_type === 'student' && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Student Pilot Information</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="flight_school" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Flight School
                      </label>
                      <input
                        type="text"
                        name="flight_school"
                        id="flight_school"
                        value={formData.flight_school}
                        onChange={handleChange}
                        placeholder="e.g., Island Air, Freelance"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      />
                    </div>
                    <div>
                      <label htmlFor="instructor_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Instructor Name
                      </label>
                      <input
                        type="text"
                        name="instructor_name"
                        id="instructor_name"
                        value={formData.instructor_name}
                        onChange={handleChange}
                        placeholder="e.g., Jane Smith"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Account Security */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Account Security</h2>
              <p className="mt-1 text-sm text-gray-500">Manage your account security settings</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Password</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Keep your account secure by regularly updating your password.
                  </p>
                </div>
                <Link
                  href="/change-password"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0d1e26] hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] transition-colors"
                >
                  Change Password
                </Link>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0d1e26] hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
