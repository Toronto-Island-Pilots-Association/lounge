'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/Loading'
import { COUNTRIES, getStatesProvinces } from './constants'
import type { MembershipLevelKey } from '@/lib/settings'

const DEFAULT_FEES: Record<MembershipLevelKey, number> = {
  Full: 45,
  Student: 25,
  Associate: 25,
  Corporate: 125,
  Honorary: 0,
}

function BecomeMemberForm() {
  const [membershipFees, setMembershipFees] = useState<Record<MembershipLevelKey, number>>(DEFAULT_FEES)

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings/membership-fees/public')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load fees'))))
      .then((data: { fees: Record<MembershipLevelKey, number> }) => {
        if (!cancelled && data.fees) setMembershipFees(data.fees)
      })
      .catch(() => { /* keep default fees */ })
    return () => { cancelled = true }
  }, [])
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    // Mailing Address
    street: '',
    city: '',
    provinceState: '',
    postalZipCode: '',
    country: '',
    // Membership Application
    membershipClass: '',
    // COPA Membership
    isCopaMember: '',
    joinCopaFlight32: '',
    copaMembershipNumber: '',
    // Statement of Interest
    statementOfInterest: '',
    // Interests (array)
    interests: [] as string[],
    // Acknowledgements
    agreedToBylaws: false,
    agreedToGovernancePolicy: false,
    understandsApprovalProcess: false,
    agreedToElectronicInfo: false,
    // Existing fields
    pilotLicenseType: '',
    aircraftType: '',
    callSign: '',
    howOftenFlyFromYTZ: '',
    howDidYouHear: '',
    flightSchool: '',
    instructorName: '',
    studentNotes: '',
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
    const target = e.target
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    const name = target.name

    // Reset conditional fields when parent field changes
    if (name === 'isCopaMember' && value !== 'yes') {
      setFormData(prev => ({
        ...prev,
        [name]: String(value),
        joinCopaFlight32: '',
        copaMembershipNumber: '',
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleInterestChange = (interestValue: string, checked: boolean) => {
    setFormData(prev => {
      const currentInterests = prev.interests || []
      if (checked) {
        // Add interest if not already in array
        if (!currentInterests.includes(interestValue)) {
          return { ...prev, interests: [...currentInterests, interestValue] }
        }
      } else {
        // Remove interest from array
        return { ...prev, interests: currentInterests.filter(i => i !== interestValue) }
      }
      return prev
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate interests
    if (!Array.isArray(formData.interests) || formData.interests.length === 0) {
      setError('Please select at least one interest')
      return
    }
    
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
          // Mailing Address
          street: formData.street,
          city: formData.city,
          provinceState: formData.provinceState,
          postalZipCode: formData.postalZipCode,
          country: formData.country,
          // Membership Application
          membershipClass: formData.membershipClass,
          // COPA Membership
          isCopaMember: formData.isCopaMember,
          joinCopaFlight32: formData.joinCopaFlight32,
          copaMembershipNumber: formData.copaMembershipNumber,
          // Statement of Interest
          statementOfInterest: formData.statementOfInterest,
          // Interests
          interests: formData.interests,
          // Acknowledgements
          agreedToBylaws: formData.agreedToBylaws,
          agreedToGovernancePolicy: formData.agreedToGovernancePolicy,
          understandsApprovalProcess: formData.understandsApprovalProcess,
          agreedToElectronicInfo: formData.agreedToElectronicInfo,
          // Existing fields
          pilotLicenseType: formData.pilotLicenseType,
          aircraftType: formData.aircraftType,
          callSign: formData.callSign,
          howOftenFlyFromYTZ: formData.howOftenFlyFromYTZ,
          howDidYouHear: formData.howDidYouHear,
          isStudentPilot: formData.pilotLicenseType === 'student' || formData.membershipClass === 'student',
          flightSchool: (formData.pilotLicenseType === 'student' || formData.membershipClass === 'student') ? formData.flightSchool : '',
          instructorName: (formData.pilotLicenseType === 'student' || formData.membershipClass === 'student') ? formData.instructorName : '',
          studentNotes: formData.studentNotes || '',
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
        street: '',
        city: '',
        provinceState: '',
        postalZipCode: '',
        country: '',
        membershipClass: '',
        isCopaMember: '',
        joinCopaFlight32: '',
        copaMembershipNumber: '',
        statementOfInterest: '',
        interests: [],
        agreedToBylaws: false,
        agreedToGovernancePolicy: false,
        understandsApprovalProcess: false,
        agreedToElectronicInfo: false,
        pilotLicenseType: '',
        aircraftType: '',
        callSign: '',
        howOftenFlyFromYTZ: '',
        howDidYouHear: '',
        flightSchool: '',
        instructorName: '',
        studentNotes: '',
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

        {!success && (
          <p className="text-center text-sm text-gray-600 mb-6">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[#0d1e26] hover:text-[#416e82]">
              Sign in
            </Link>
          </p>
        )}

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
                  autoComplete="given-name"
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
                  autoComplete="family-name"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
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
                  autoComplete="tel"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Mailing Address */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-3">Mailing Address</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                    Street <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="street"
                    name="street"
                    type="text"
                    required
                    autoComplete="street-address"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                    value={formData.street}
                    onChange={handleChange}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      required
                      autoComplete="address-level2"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="country"
                      name="country"
                      required
                      autoComplete="country"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      value={formData.country}
                      onChange={(e) => {
                        handleChange(e)
                        // Reset province/state when country changes
                        setFormData(prev => ({
                          ...prev,
                          country: e.target.value,
                          provinceState: '',
                        }))
                      }}
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="provinceState" className="block text-sm font-medium text-gray-700 mb-1">
                      Province / State <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="provinceState"
                      name="provinceState"
                      required
                      autoComplete="address-level1"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      value={formData.provinceState}
                      onChange={handleChange}
                    >
                      {getStatesProvinces(formData.country).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="postalZipCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Postal / ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="postalZipCode"
                      name="postalZipCode"
                      type="text"
                      required
                      autoComplete="postal-code"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      value={formData.postalZipCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
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
                  autoComplete="new-password"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Membership Application */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Membership Application</h2>
            <div>
              <label htmlFor="membershipClass" className="block text-sm font-medium text-gray-700 mb-1">
                Applying for TIPA Membership Class: <span className="text-red-500">*</span>
              </label>
              <select
                id="membershipClass"
                name="membershipClass"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                value={formData.membershipClass}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                <option value="full">Full — ${membershipFees.Full}/year (free trial until Sept 1)</option>
                <option value="student">Student — ${membershipFees.Student}/year (12-month free)</option>
                <option value="associate">Associate — ${membershipFees.Associate}/year (free trial until Sept 1)</option>
                <option value="corporate">Corporate — ${membershipFees.Corporate}/year</option>
              </select>
            </div>

          </div>

          {/* Aviation Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Aviation Information</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please provide your aviation background information:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pilotLicenseType" className="block text-sm font-medium text-gray-700 mb-1">
                  Pilot License Type {formData.membershipClass === 'student' && <span className="text-red-500">*</span>}
                </label>
                <select
                  id="pilotLicenseType"
                  name="pilotLicenseType"
                  required={formData.membershipClass === 'student'}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
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
                  type="text"
                  id="aircraftType"
                  name="aircraftType"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.aircraftType}
                  onChange={handleChange}
                  placeholder="e.g., Cessna 172, Piper Cherokee"
                />
              </div>
              <div>
                <label htmlFor="callSign" className="block text-sm font-medium text-gray-700 mb-1">
                  Call Sign
                </label>
                <input
                  type="text"
                  id="callSign"
                  name="callSign"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  value={formData.callSign}
                  onChange={handleChange}
                  placeholder="e.g., C-GABC"
                />
              </div>
              <div>
                <label htmlFor="howOftenFlyFromYTZ" className="block text-sm font-medium text-gray-700 mb-1">
                  How Often Do You Fly From YTZ? {formData.membershipClass === 'student' && <span className="text-red-500">*</span>}
                </label>
                <select
                  id="howOftenFlyFromYTZ"
                  name="howOftenFlyFromYTZ"
                  required={formData.membershipClass === 'student'}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
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
            </div>

            {/* Student Pilot Fields - Show if student membership class OR student pilot license type */}
            {(formData.membershipClass === 'student' || formData.pilotLicenseType === 'student') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Student Pilot Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="flightSchool" className="block text-sm font-medium text-gray-700 mb-1">
                      Flight School / Training Organization {formData.membershipClass === 'student' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      id="flightSchool"
                      name="flightSchool"
                      required={formData.membershipClass === 'student'}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      value={formData.flightSchool}
                      onChange={handleChange}
                      placeholder="e.g., Island Air, Freelance, etc."
                    />
                  </div>
                  <div>
                    <label htmlFor="instructorName" className="block text-sm font-medium text-gray-700 mb-1">
                      Instructor Name {formData.membershipClass === 'student' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      id="instructorName"
                      name="instructorName"
                      required={formData.membershipClass === 'student'}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      value={formData.instructorName}
                      onChange={handleChange}
                      placeholder="e.g., Jane Smith"
                    />
                  </div>
                </div>
                {formData.membershipClass === 'student' && (
                  <div className="mt-4">
                    <label htmlFor="studentNotes" className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Student Information (Optional)
                    </label>
                    <textarea
                      id="studentNotes"
                      name="studentNotes"
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      value={formData.studentNotes || ''}
                      onChange={handleChange}
                      placeholder="e.g., Expected graduation date, current training stage, etc."
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* COPA Membership */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">COPA Membership</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Are you a COPA Member? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isCopaMember"
                      value="yes"
                      required
                      className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                      checked={formData.isCopaMember === 'yes'}
                      onChange={handleChange}
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isCopaMember"
                      value="no"
                      required
                      className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                      checked={formData.isCopaMember === 'no'}
                      onChange={handleChange}
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>

              {formData.isCopaMember === 'yes' && (
                <div className="pt-4 border-t border-gray-200 space-y-4">
                  <div>
                    <label htmlFor="copaMembershipNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Please enter your COPA Membership Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="copaMembershipNumber"
                      name="copaMembershipNumber"
                      type="text"
                      required={formData.isCopaMember === 'yes'}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                      value={formData.copaMembershipNumber}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Would you like to join COPA Flight 32? COPA Flight 32 is free to join and a working partner with TIPA.
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="joinCopaFlight32"
                          value="yes"
                          className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                          checked={formData.joinCopaFlight32 === 'yes'}
                          onChange={handleChange}
                        />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="joinCopaFlight32"
                          value="no"
                          className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]"
                          checked={formData.joinCopaFlight32 === 'no'}
                          onChange={handleChange}
                        />
                        <span className="text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interests */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Interests</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are your main interests? <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 font-normal ml-2">(Select all that apply)</span>
              </label>
              <div className="space-y-2">
                {[
                  { value: 'flying', label: 'Flying' },
                  { value: 'aircraft-ownership', label: 'Aircraft Ownership' },
                  { value: 'training', label: 'Training & Education' },
                  { value: 'safety', label: 'Safety & Proficiency' },
                  { value: 'community', label: 'Community & Networking' },
                  { value: 'events', label: 'Events & Social Activities' },
                  { value: 'advocacy', label: 'Aviation Advocacy' },
                  { value: 'island-operations', label: 'Island Operations / YTZ' },
                  { value: 'aircraft-maintenance', label: 'Aircraft Maintenance' },
                  { value: 'mentoring', label: 'Mentoring' },
                  { value: 'hangar-storage', label: 'Hangar/Storage' },
                  { value: 'other', label: 'Other' },
                ].map((interest) => (
                  <label key={interest.value} className="flex items-center">
                    <input
                      type="checkbox"
                      name="interests"
                      value={interest.value}
                      checked={Array.isArray(formData.interests) && formData.interests.includes(interest.value)}
                      onChange={(e) => handleInterestChange(interest.value, e.target.checked)}
                      className="h-4 w-4 text-[#0d1e26] focus:ring-[#0d1e26] border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{interest.label}</span>
                  </label>
                ))}
              </div>
              {(!Array.isArray(formData.interests) || formData.interests.length === 0) && (
                <p className="mt-2 text-xs text-red-600">Please select at least one interest</p>
              )}
            </div>
          </div>

          {/* Statement of Interest */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statement of Interest</h2>
            <div>
              <label htmlFor="statementOfInterest" className="block text-sm font-medium text-gray-700 mb-1">
                Briefly describe your connection to YTZ or interest in supporting TIPA.
              </label>
              <textarea
                id="statementOfInterest"
                name="statementOfInterest"
                rows={4}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                value={formData.statementOfInterest}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Acknowledgements */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acknowledgements</h2>
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="agreedToBylaws"
                  required
                  className="mt-1 mr-3 text-[#0d1e26] focus:ring-[#0d1e26]"
                  checked={formData.agreedToBylaws}
                  onChange={handleChange}
                />
                <span className="text-sm text-gray-700">
                  I have reviewed and agree to TIPA's By-Laws <span className="text-red-500">*</span>
                </span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="agreedToGovernancePolicy"
                  required
                  className="mt-1 mr-3 text-[#0d1e26] focus:ring-[#0d1e26]"
                  checked={formData.agreedToGovernancePolicy}
                  onChange={handleChange}
                />
                <span className="text-sm text-gray-700">
                  I have reviewed and agree to the Governance & Membership Policy <span className="text-red-500">*</span>
                </span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="understandsApprovalProcess"
                  required
                  className="mt-1 mr-3 text-[#0d1e26] focus:ring-[#0d1e26]"
                  checked={formData.understandsApprovalProcess}
                  onChange={handleChange}
                />
                <span className="text-sm text-gray-700">
                  I understand my application is subject to approval and does not create membership until approved <span className="text-red-500">*</span>
                </span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="agreedToElectronicInfo"
                  required
                  className="mt-1 mr-3 text-[#0d1e26] focus:ring-[#0d1e26]"
                  checked={formData.agreedToElectronicInfo}
                  onChange={handleChange}
                />
                <span className="text-sm text-gray-700">
                  I agree to receive information electronically (e.g. by email) <span className="text-red-500">*</span>
                </span>
              </label>
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

