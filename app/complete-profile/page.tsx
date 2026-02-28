'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/Loading'
import { COUNTRIES, getStatesProvinces } from '@/app/become-a-member/constants'

const INTEREST_OPTIONS = [
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
]

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    // Mailing Address
    street: '',
    city: '',
    provinceState: '',
    postalZipCode: '',
    country: '',
    // Membership (read-only display)
    membershipLevel: '',
    // Aviation
    pilotLicenseType: '',
    aircraftType: '',
    callSign: '',
    howOftenFlyFromYTZ: '',
    howDidYouHear: '',
    flightSchool: '',
    instructorName: '',
    studentNotes: '',
    // COPA
    isCopaMember: '',
    joinCopaFlight32: '',
    copaMembershipNumber: '',
    // Statement of Interest
    statementOfInterest: '',
    // Interests
    interests: [] as string[],
    // Acknowledgements (required for submit, not stored)
    agreedToBylaws: false,
    agreedToGovernancePolicy: false,
    understandsApprovalProcess: false,
    agreedToElectronicInfo: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          const p = data.profile
          if (p) {
            const interestsParsed = (() => {
              try {
                if (p.interests) return typeof p.interests === 'string' ? JSON.parse(p.interests) : p.interests
              } catch { /* noop */ }
              return []
            })()
            setFormData({
              firstName: p.first_name || '',
              lastName: p.last_name || '',
              phone: p.phone || '',
              street: p.street || '',
              city: p.city || '',
              provinceState: p.province_state || '',
              postalZipCode: p.postal_zip_code || '',
              country: p.country || '',
              membershipLevel: p.membership_level || '',
              pilotLicenseType: p.pilot_license_type || '',
              aircraftType: p.aircraft_type || '',
              callSign: p.call_sign || '',
              howOftenFlyFromYTZ: p.how_often_fly_from_ytz || '',
              howDidYouHear: p.how_did_you_hear || '',
              flightSchool: p.flight_school || '',
              instructorName: p.instructor_name || '',
              studentNotes: '',
              isCopaMember: p.is_copa_member || '',
              joinCopaFlight32: p.join_copa_flight_32 || '',
              copaMembershipNumber: p.copa_membership_number || '',
              statementOfInterest: p.statement_of_interest || '',
              interests: Array.isArray(interestsParsed) ? interestsParsed : [],
              agreedToBylaws: false,
              agreedToGovernancePolicy: false,
              understandsApprovalProcess: false,
              agreedToElectronicInfo: false,
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
    const target = e.target
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    const name = target.name
    if (name === 'isCopaMember' && value !== 'yes') {
      setFormData((prev) => ({
        ...prev,
        [name]: String(value),
        joinCopaFlight32: '',
        copaMembershipNumber: '',
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleInterestChange = (interestValue: string, checked: boolean) => {
    setFormData((prev) => {
      const current = prev.interests || []
      if (checked) return current.includes(interestValue) ? prev : { ...prev, interests: [...current, interestValue] }
      return { ...prev, interests: current.filter((i) => i !== interestValue) }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    if (!Array.isArray(formData.interests) || formData.interests.length === 0) {
      setError('Please select at least one interest')
      setSaving(false)
      return
    }
    if (!formData.agreedToBylaws || !formData.agreedToGovernancePolicy || !formData.understandsApprovalProcess || !formData.agreedToElectronicInfo) {
      setError('Please accept all acknowledgements')
      setSaving(false)
      return
    }
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          full_name: `${formData.firstName} ${formData.lastName}`.trim() || null,
          phone: formData.phone || null,
          street: formData.street || null,
          city: formData.city || null,
          province_state: formData.provinceState || null,
          postal_zip_code: formData.postalZipCode || null,
          country: formData.country || null,
          pilot_license_type: formData.pilotLicenseType || null,
          aircraft_type: formData.aircraftType || null,
          call_sign: formData.callSign || null,
          how_often_fly_from_ytz: formData.howOftenFlyFromYTZ || null,
          how_did_you_hear: formData.howDidYouHear || null,
          flight_school: formData.flightSchool || null,
          instructor_name: formData.instructorName || null,
          is_copa_member: formData.isCopaMember || null,
          join_copa_flight_32: formData.joinCopaFlight32 || null,
          copa_membership_number: formData.copaMembershipNumber || null,
          statement_of_interest: formData.statementOfInterest || null,
          interests: formData.interests,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update profile')
      setSuccess(true)
      setTimeout(() => router.push('/add-payment'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading message="Loading..." fullScreen />

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="mt-2 text-gray-600">
            Please provide the information below to complete your membership profile.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}
        {success && (
          <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4 text-green-700">
            Profile updated successfully! You will be redirected to add your payment information.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information + Mailing Address */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input id="firstName" name="firstName" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.firstName} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input id="lastName" name="lastName" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.lastName} onChange={handleChange} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input id="phone" name="phone" type="tel" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" placeholder="(555) 123-4567" value={formData.phone} onChange={handleChange} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-3">Mailing Address</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street <span className="text-red-500">*</span></label>
                  <input id="street" name="street" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.street} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                    <input id="city" name="city" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.city} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
                    <select id="country" name="country" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.country} onChange={(e) => { handleChange(e); setFormData((prev) => ({ ...prev, country: e.target.value, provinceState: '' })) }}>
                      {COUNTRIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="provinceState" className="block text-sm font-medium text-gray-700 mb-1">Province / State <span className="text-red-500">*</span></label>
                    <select id="provinceState" name="provinceState" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.provinceState} onChange={handleChange}>
                      {getStatesProvinces(formData.country).map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="postalZipCode" className="block text-sm font-medium text-gray-700 mb-1">Postal / ZIP Code <span className="text-red-500">*</span></label>
                    <input id="postalZipCode" name="postalZipCode" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.postalZipCode} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Membership (read-only) */}
          {formData.membershipLevel && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Membership</h2>
              <p className="text-sm text-gray-600">Your membership level: <strong className="text-gray-900">{formData.membershipLevel}</strong></p>
            </div>
          )}

          {/* Aviation Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Aviation Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pilotLicenseType" className="block text-sm font-medium text-gray-700 mb-1">Pilot License Type</label>
                <select id="pilotLicenseType" name="pilotLicenseType" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.pilotLicenseType} onChange={handleChange}>
                  <option value="">Select...</option>
                  <option value="student">Student Pilot</option>
                  <option value="private">Private Pilot</option>
                  <option value="commercial">Commercial Pilot</option>
                  <option value="atp">Airline Transport Pilot</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="aircraftType" className="block text-sm font-medium text-gray-700 mb-1">Aircraft Type</label>
                <input id="aircraftType" name="aircraftType" type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" placeholder="e.g., Cessna 172, Piper Cherokee" value={formData.aircraftType} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="callSign" className="block text-sm font-medium text-gray-700 mb-1">Call Sign</label>
                <input id="callSign" name="callSign" type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" placeholder="e.g., C-GABC" value={formData.callSign} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="howOftenFlyFromYTZ" className="block text-sm font-medium text-gray-700 mb-1">How often do you fly from YTZ?</label>
                <select id="howOftenFlyFromYTZ" name="howOftenFlyFromYTZ" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.howOftenFlyFromYTZ} onChange={handleChange}>
                  <option value="">Select...</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="rarely">Rarely</option>
                </select>
              </div>
            </div>
            {(formData.pilotLicenseType === 'student' || formData.membershipLevel === 'Student') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Student Pilot Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="flightSchool" className="block text-sm font-medium text-gray-700 mb-1">Flight School / Training Organization</label>
                    <input id="flightSchool" name="flightSchool" type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" placeholder="e.g., Island Air" value={formData.flightSchool} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="instructorName" className="block text-sm font-medium text-gray-700 mb-1">Instructor Name</label>
                    <input id="instructorName" name="instructorName" type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" placeholder="e.g., Jane Smith" value={formData.instructorName} onChange={handleChange} />
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="studentNotes" className="block text-sm font-medium text-gray-700 mb-1">Additional Student Information (Optional)</label>
                  <textarea id="studentNotes" name="studentNotes" rows={3} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" placeholder="e.g., Expected graduation date" value={formData.studentNotes} onChange={handleChange} />
                </div>
              </div>
            )}
          </div>

          {/* COPA Membership */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">COPA Membership</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Are you a COPA Member? <span className="text-red-500">*</span></label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input type="radio" name="isCopaMember" value="yes" required className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]" checked={formData.isCopaMember === 'yes'} onChange={handleChange} />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="isCopaMember" value="no" required className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]" checked={formData.isCopaMember === 'no'} onChange={handleChange} />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>
              {formData.isCopaMember === 'yes' && (
                <div className="pt-4 border-t border-gray-200 space-y-4">
                  <div>
                    <label htmlFor="copaMembershipNumber" className="block text-sm font-medium text-gray-700 mb-1">COPA Membership Number <span className="text-red-500">*</span></label>
                    <input id="copaMembershipNumber" name="copaMembershipNumber" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.copaMembershipNumber} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Would you like to join COPA Flight 32?</label>
                    <div className="flex gap-6">
                      <label className="flex items-center">
                        <input type="radio" name="joinCopaFlight32" value="yes" className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]" checked={formData.joinCopaFlight32 === 'yes'} onChange={handleChange} />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="joinCopaFlight32" value="no" className="mr-2 text-[#0d1e26] focus:ring-[#0d1e26]" checked={formData.joinCopaFlight32 === 'no'} onChange={handleChange} />
                        <span className="text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statement of Interest */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statement of Interest</h2>
            <label htmlFor="statementOfInterest" className="block text-sm font-medium text-gray-700 mb-1">Briefly describe your connection to YTZ or interest in supporting TIPA.</label>
            <textarea id="statementOfInterest" name="statementOfInterest" rows={4} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.statementOfInterest} onChange={handleChange} />
          </div>

          {/* Interests */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Interests</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">What are your main interests? <span className="text-red-500">*</span> <span className="text-xs text-gray-500 font-normal">(Select all that apply)</span></label>
            <div className="space-y-2">
              {INTEREST_OPTIONS.map((interest) => (
                <label key={interest.value} className="flex items-center">
                  <input type="checkbox" name="interests" value={interest.value} checked={formData.interests.includes(interest.value)} onChange={(e) => handleInterestChange(interest.value, e.target.checked)} className="h-4 w-4 text-[#0d1e26] focus:ring-[#0d1e26] border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">{interest.label}</span>
                </label>
              ))}
            </div>
            {formData.interests.length === 0 && <p className="mt-2 text-xs text-red-600">Please select at least one interest</p>}
          </div>

          {/* How did you hear */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
            <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 mb-1">How did you hear about TIPA?</label>
            <select id="howDidYouHear" name="howDidYouHear" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]" value={formData.howDidYouHear} onChange={handleChange}>
              <option value="">Select...</option>
              <option value="friend">Friend/Colleague</option>
              <option value="social-media">Social Media</option>
              <option value="website">Website</option>
              <option value="event">Event</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Acknowledgements */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acknowledgements</h2>
            <div className="space-y-3">
              <label className="flex items-start">
                <input type="checkbox" name="agreedToBylaws" required className="mt-1 mr-3 text-[#0d1e26] focus:ring-[#0d1e26]" checked={formData.agreedToBylaws} onChange={handleChange} />
                <span className="text-sm text-gray-700">I have reviewed and agree to TIPA&apos;s <Link href="https://tipa.ca/tipa-by-laws/" target="_blank" rel="noopener noreferrer" className="text-[#0d1e26] underline hover:no-underline">By-Laws</Link> <span className="text-red-500">*</span></span>
              </label>
              <label className="flex items-start">
                <input type="checkbox" name="agreedToGovernancePolicy" required className="mt-1 mr-3 text-[#0d1e26] focus:ring-[#0d1e26]" checked={formData.agreedToGovernancePolicy} onChange={handleChange} />
                <span className="text-sm text-gray-700">I have reviewed and agree to the <Link href="https://tipa.ca/membership-policy/" target="_blank" rel="noopener noreferrer" className="text-[#0d1e26] underline hover:no-underline">Governance &amp; Membership Policy</Link> <span className="text-red-500">*</span></span>
              </label>
              <label className="flex items-start">
                <input type="checkbox" name="understandsApprovalProcess" required className="mt-1 mr-3 text-[#0d1e26] focus:ring-[#0d1e26]" checked={formData.understandsApprovalProcess} onChange={handleChange} />
                <span className="text-sm text-gray-700">I understand my application is subject to approval and does not create membership until approved <span className="text-red-500">*</span></span>
              </label>
              <label className="flex items-start">
                <input type="checkbox" name="agreedToElectronicInfo" required className="mt-1 mr-3 text-[#0d1e26] focus:ring-[#0d1e26]" checked={formData.agreedToElectronicInfo} onChange={handleChange} />
                <span className="text-sm text-gray-700">I agree to receive information electronically (e.g. by email) <span className="text-red-500">*</span></span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={saving} className="px-6 py-3 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
