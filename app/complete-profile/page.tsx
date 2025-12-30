'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/Loading'

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    pilotLicenseType: '',
    aircraftType: '',
    callSign: '',
    howOftenFlyFromYTZ: '',
    howDidYouHear: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Load existing profile data
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          const profile = data.profile
          if (profile) {
            setFormData({
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              phone: profile.phone || '',
              pilotLicenseType: profile.pilot_license_type || '',
              aircraftType: profile.aircraft_type || '',
              callSign: profile.call_sign || '',
              howOftenFlyFromYTZ: profile.how_often_fly_from_ytz || '',
              howDidYouHear: profile.how_did_you_hear || '',
            })
          }
        } else if (response.status === 401) {
          router.push('/login')
          return
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          full_name: `${formData.firstName} ${formData.lastName}`.trim() || null,
          phone: formData.phone,
          pilot_license_type: formData.pilotLicenseType,
          aircraft_type: formData.aircraftType,
          call_sign: formData.callSign,
          how_often_fly_from_ytz: formData.howOftenFlyFromYTZ,
          how_did_you_hear: formData.howDidYouHear,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setSuccess(true)
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading message="Loading..." fullScreen />
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="mt-2 text-gray-600">
            Please provide some additional information to complete your membership profile.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            Profile updated successfully! Redirecting to dashboard...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Aviation Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Aviation Information (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pilotLicenseType" className="block text-sm font-medium text-gray-700 mb-1">
                  License Type
                </label>
                <select
                  id="pilotLicenseType"
                  name="pilotLicenseType"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.pilotLicenseType}
                  onChange={handleChange}
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
                <label htmlFor="aircraftType" className="block text-sm font-medium text-gray-700 mb-1">
                  Aircraft Type
                </label>
                <input
                  id="aircraftType"
                  name="aircraftType"
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  placeholder="e.g., Cessna 172, Piper Cherokee"
                  value={formData.aircraftType}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="callSign" className="block text-sm font-medium text-gray-700 mb-1">
                  Call Sign
                </label>
                <input
                  id="callSign"
                  name="callSign"
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.callSign}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="howOftenFlyFromYTZ" className="block text-sm font-medium text-gray-700 mb-1">
                  How often do you fly from YTZ?
                </label>
                <select
                  id="howOftenFlyFromYTZ"
                  name="howOftenFlyFromYTZ"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.howOftenFlyFromYTZ}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="rarely">Rarely</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 mb-1">
                  How did you hear about us?
                </label>
                <textarea
                  id="howDidYouHear"
                  name="howDidYouHear"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.howDidYouHear}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Skip for now
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#0d1e26] text-white rounded-md hover:bg-[#0a171c] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

