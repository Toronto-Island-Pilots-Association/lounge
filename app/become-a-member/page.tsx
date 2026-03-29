'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/Loading'
import PasswordInput from '@/components/PasswordInput'
import { COUNTRIES, getStatesProvinces } from './constants'
import type { MembershipLevelKey, SignupField } from '@/lib/settings-shared'

const DEFAULT_FEES: Record<MembershipLevelKey, number> = {
  full: 45,
  student: 25,
  associate: 25,
  corporate: 125,
  honorary: 0,
}

function BecomeMemberForm() {
  const [membershipFees, setMembershipFees] = useState<Record<MembershipLevelKey, number>>(DEFAULT_FEES)
  const [signupFields, setSignupFields] = useState<SignupField[] | null>(null)
  const [enabledLevels, setEnabledLevels] = useState<Record<MembershipLevelKey, boolean> | null>(null)
  const [orgName, setOrgName] = useState<string>('')
  const [bylawsUrl, setBylawsUrl] = useState<string | null>(null)
  const [membershipPolicyUrl, setMembershipPolicyUrl] = useState<string | null>(null)
  const [orgConfigReady, setOrgConfigReady] = useState(false)

  // Helper: is a signup field section enabled?
  const fieldEnabled = (key: string) => {
    if (!signupFields) return false
    return signupFields.find(f => f.key === key)?.enabled ?? false
  }
  const fieldRequired = (key: string) => {
    if (!signupFields) return false
    return signupFields.find(f => f.key === key)?.required ?? false
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/org/config')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return
        if (data.membership?.fees) setMembershipFees(data.membership.fees)
        if (data.signupFields)     setSignupFields(data.signupFields)
        if (data.membership?.enabledLevels) setEnabledLevels(data.membership.enabledLevels)
        if (data.org?.name)        setOrgName(data.org.displayName || data.org.name)
        if (data.org?.bylawsUrl)           setBylawsUrl(data.org.bylawsUrl)
        if (data.org?.membershipPolicyUrl) setMembershipPolicyUrl(data.org.membershipPolicyUrl)
        setOrgConfigReady(true)
      })
      .catch(() => {
        setOrgConfigReady(true)
      })
    return () => { cancelled = true }
  }, [])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | string[]>>({})

  const handleCustomFieldChange = (key: string, value: string | string[]) =>
    setCustomFieldValues(p => ({ ...p, [key]: value }))

  const handleCustomCheckboxGroupChange = (key: string, option: string, checked: boolean) => {
    setCustomFieldValues(p => {
      const current = Array.isArray(p[key]) ? (p[key] as string[]) : []
      return { ...p, [key]: checked ? [...current, option] : current.filter(v => v !== option) }
    })
  }

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
    statementOfInterest: '',
    // Interests (array)
    interests: [] as string[],
    // Acknowledgements
    agreedToBylaws: false,
    agreedToGovernancePolicy: false,
    understandsApprovalProcess: false,
    agreedToElectronicInfo: false,
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
    const target = e.target
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    const name = target.name

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
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
    if (!orgConfigReady) {
      setError('Please wait for the form to finish loading.')
      return
    }
    if (
      !formData.agreedToBylaws ||
      !formData.agreedToGovernancePolicy ||
      !formData.understandsApprovalProcess ||
      !formData.agreedToElectronicInfo
    ) {
      setError('Please accept all acknowledgements')
      return
    }

    // Validate interests (only if the field is enabled)
    if (fieldEnabled('interests') && (!Array.isArray(formData.interests) || formData.interests.length === 0)) {
      setError('Please select at least one interest')
      return
    }
    if (fieldEnabled('how_did_you_hear') && fieldRequired('how_did_you_hear') && !String(formData.howDidYouHear || '').trim()) {
      setError('Please tell us how you heard about us')
      return
    }
    const customDefs = signupFields?.filter(f => f.isCustom && f.enabled) ?? []
    for (const f of customDefs) {
      if (!f.required) continue
      const v = customFieldValues[f.key]
      if (f.type === 'checkbox_group') {
        if (!Array.isArray(v) || v.length === 0) {
          setError(`Please complete: ${f.label}`)
          return
        }
      } else if (f.type === 'boolean') {
        if (v !== 'true') {
          setError(`Please complete: ${f.label}`)
          return
        }
      } else {
        const s = v === undefined || v === null ? '' : String(v)
        if (!s.trim()) {
          setError(`Please complete: ${f.label}`)
          return
        }
      }
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customFields: customFieldValues,
          email: formData.email,
          password: formData.password,
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          provinceState: formData.provinceState,
          postalZipCode: formData.postalZipCode,
          country: formData.country,
          membershipClass: formData.membershipClass,
          statementOfInterest: formData.statementOfInterest,
          interests: formData.interests,
          agreedToBylaws: formData.agreedToBylaws,
          agreedToGovernancePolicy: formData.agreedToGovernancePolicy,
          understandsApprovalProcess: formData.understandsApprovalProcess,
          agreedToElectronicInfo: formData.agreedToElectronicInfo,
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
        street: '',
        city: '',
        provinceState: '',
        postalZipCode: '',
        country: '',
        membershipClass: '',
        statementOfInterest: '',
        interests: [],
        agreedToBylaws: false,
        agreedToGovernancePolicy: false,
        understandsApprovalProcess: false,
        agreedToElectronicInfo: false,
        howDidYouHear: '',
      })
      setCustomFieldValues({})
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
          {orgName && (
            <p className="text-gray-600">
              Join {orgName}
            </p>
          )}
        </div>

        {!success && (
          <p className="text-center text-sm text-gray-600 mb-6">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[var(--color-primary)] hover:text-[#416e82]">
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
            <p className="text-lg text-gray-700 mb-4">
              Your account has been created successfully. You can now log in to access your account.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Your account is pending admin approval before you can access all features.
            </p>
            <div className="mt-6">
              <Link
                href="/login?redirectTo=%2Fadd-payment"
                className="inline-block px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors"
              >
                Log in
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
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
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
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
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
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              {fieldEnabled('phone') && (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number {fieldRequired('phone') && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required={fieldRequired('phone')}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              )}
            </div>

            {/* Mailing Address */}
            {fieldEnabled('address') && <div className="mt-4 pt-4 border-t border-gray-200">
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
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
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
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
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
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
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
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
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
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      value={formData.postalZipCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>}
          </div>

          {/* Account Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Membership Application */}
          {fieldEnabled('membership_class') && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Membership Application</h2>
            <div>
              <label htmlFor="membershipClass" className="block text-sm font-medium text-gray-700 mb-1">
                Membership Class <span className="text-red-500">*</span>
              </label>
              <select
                id="membershipClass"
                name="membershipClass"
                required={fieldRequired('membership_class')}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                value={formData.membershipClass}
                onChange={handleChange}
              >
                <option value="">Select…</option>
                {(enabledLevels?.full     ?? true) && <option value="full">Full — ${membershipFees.full}/year</option>}
                {(enabledLevels?.student  ?? true) && <option value="student">Student — ${membershipFees.student}/year</option>}
                {(enabledLevels?.associate ?? true) && <option value="associate">Associate — ${membershipFees.associate}/year</option>}
                {(enabledLevels?.corporate ?? true) && <option value="corporate">Corporate — ${membershipFees.corporate}/year</option>}
              </select>
            </div>
          </div>
          )}

          {/* Interests */}
          {fieldEnabled('interests') && (
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
                  { value: 'advocacy', label: 'Advocacy & policy' },
                  { value: 'island-operations', label: 'Regional / local activities' },
                  { value: 'aircraft-maintenance', label: 'Aircraft Maintenance' },
                  { value: 'mentoring', label: 'Mentoring' },
                  { value: 'hangar-storage', label: 'Hangar/Storage' },
                  { value: 'volunteer-flying-public-benefit', label: 'Volunteer Flying (Public Benefit)' },
                  { value: 'other', label: 'Other' },
                ].map((interest) => (
                  <label key={interest.value} className="flex items-center">
                    <input
                      type="checkbox"
                      name="interests"
                      value={interest.value}
                      checked={Array.isArray(formData.interests) && formData.interests.includes(interest.value)}
                      onChange={(e) => handleInterestChange(interest.value, e.target.checked)}
                      className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded"
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
          )}

          {/* Statement of Interest */}
          {fieldEnabled('statement_of_interest') && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statement of Interest</h2>
            <div>
              <label htmlFor="statementOfInterest" className="block text-sm font-medium text-gray-700 mb-1">
                Briefly describe your interest in joining. {fieldRequired('statement_of_interest') && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id="statementOfInterest"
                name="statementOfInterest"
                rows={4}
                required={fieldRequired('statement_of_interest')}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                value={formData.statementOfInterest}
                onChange={handleChange}
              />
            </div>
          </div>
          )}

          {/* Custom fields */}
          {signupFields?.filter(f => f.isCustom && f.enabled).map(field => (
            <div key={field.key} className="bg-gray-50 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.helpText && <p className="text-xs text-gray-500 mb-2">{field.helpText}</p>}

                {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'url' || field.type === 'number' || field.type === 'date') && (
                  <input
                    type={field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : field.type ?? 'text'}
                    required={field.required}
                    placeholder={field.placeholder ?? ''}
                    value={(customFieldValues[field.key] as string) ?? ''}
                    onChange={e => handleCustomFieldChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    required={field.required}
                    placeholder={field.placeholder ?? ''}
                    rows={4}
                    value={(customFieldValues[field.key] as string) ?? ''}
                    onChange={e => handleCustomFieldChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    required={field.required}
                    value={(customFieldValues[field.key] as string) ?? ''}
                    onChange={e => handleCustomFieldChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  >
                    <option value="">Select…</option>
                    {(field.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}

                {field.type === 'checkbox_group' && (
                  <div className="space-y-2">
                    {(field.options ?? []).map(opt => (
                      <label key={opt} className="flex items-center">
                        <input
                          type="checkbox"
                          value={opt}
                          checked={Array.isArray(customFieldValues[field.key]) && (customFieldValues[field.key] as string[]).includes(opt)}
                          onChange={e => handleCustomCheckboxGroupChange(field.key, opt, e.target.checked)}
                          className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'boolean' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      required={field.required}
                      checked={(customFieldValues[field.key] as string) === 'true'}
                      onChange={e => handleCustomFieldChange(field.key, e.target.checked ? 'true' : '')}
                      className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                )}
              </div>
            </div>
          ))}

          {/* Acknowledgements */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acknowledgements</h2>
            {!orgConfigReady ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreedToBylaws"
                    required
                    className="mt-1 mr-3 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    checked={formData.agreedToBylaws}
                    onChange={handleChange}
                  />
                  <span className="text-sm text-gray-700">
                    {bylawsUrl ? (
                      <>I have reviewed and agree to the{' '}
                        <Link href={bylawsUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline hover:no-underline">By-Laws</Link>.{' '}
                      </>
                    ) : (
                      <>I have reviewed and agree to this organization&apos;s governing documents (by-laws, constitution, or equivalent).{' '}</>
                    )}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreedToGovernancePolicy"
                    required
                    className="mt-1 mr-3 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    checked={formData.agreedToGovernancePolicy}
                    onChange={handleChange}
                  />
                  <span className="text-sm text-gray-700">
                    {membershipPolicyUrl ? (
                      <>I have reviewed and agree to the{' '}
                        <Link href={membershipPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline hover:no-underline">Governance &amp; Membership Policy</Link>.{' '}
                      </>
                    ) : (
                      <>I have reviewed and agree to this organization&apos;s membership terms and policies.{' '}</>
                    )}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="understandsApprovalProcess"
                    required
                    className="mt-1 mr-3 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
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
                    className="mt-1 mr-3 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    checked={formData.agreedToElectronicInfo}
                    onChange={handleChange}
                  />
                  <span className="text-sm text-gray-700">
                    I agree to receive information electronically (e.g. by email) <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            )}
          </div>

          {fieldEnabled('how_did_you_hear') && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
            <div>
              <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 mb-1">
                {orgName ? `How did you hear about ${orgName}?` : 'How did you hear about us?'}
                {fieldRequired('how_did_you_hear') && <span className="text-red-500"> *</span>}
              </label>
              <select
                id="howDidYouHear"
                name="howDidYouHear"
                required={fieldRequired('how_did_you_hear')}
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
          )}

          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to home
            </Link>
            <button
              type="submit"
              disabled={loading || !orgConfigReady}
              className="px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
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

