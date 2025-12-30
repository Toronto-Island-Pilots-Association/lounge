'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/Loading'

function BecomeMemberForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    pilotLicenseType: '',
    aircraftType: '',
    callSign: '',
    howOftenFlyFromYTZ: '',
    howDidYouHear: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for error in URL params (e.g., from Google OAuth redirect)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      // Clean up URL
      router.replace('/become-a-member', { scroll: false })
    }
  }, [searchParams, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          pilotLicenseType: formData.pilotLicenseType,
          aircraftType: formData.aircraftType,
          callSign: formData.callSign,
          howOftenFlyFromYTZ: formData.howOftenFlyFromYTZ,
          howDidYouHear: formData.howDidYouHear,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Show success message instead of redirecting
      setSuccess(true)
      setUserEmail(formData.email)
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        pilotLicenseType: '',
        aircraftType: '',
        callSign: '',
        howOftenFlyFromYTZ: '',
        howDidYouHear: '',
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Become a Member
          </h1>
          <p className="text-gray-600">
            Join the Toronto Island Pilots Association
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Registration Successful!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Your account has been created successfully. You can now log in to access your account.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              We've sent a welcome email to <strong>{userEmail}</strong>. Please note that your account is pending admin approval before you can access all features.
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Personal Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.password}
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
                  placeholder="e.g., C-GABC"
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
                  <option value="seasonal">Seasonal</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="rarely">Rarely</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
            <div>
              <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 mb-1">
                How did you hear about TIPA?
              </label>
              <select
                id="howDidYouHear"
                name="howDidYouHear"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.howDidYouHear}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                <option value="friend">Friend/Colleague</option>
                <option value="social-media">Social Media</option>
                <option value="website">Website</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to home
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Become a Member'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[#0d1e26] hover:text-[#416e82]">
              Sign in
            </Link>
          </p>
        </form>
        )}
      </div>
    </div>
  )
}

export default function BecomeMemberPage() {
  return (
    <Suspense fallback={<Loading message="Loading..." fullScreen />}>
      <BecomeMemberForm />
    </Suspense>
  )
}

