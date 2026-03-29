'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/Loading'
import { COUNTRIES, getStatesProvinces } from '@/app/become-a-member/constants'
import { DEFAULT_SIGNUP_FIELDS, type SignupField } from '@/lib/settings-shared'
import { COMMON_INTEREST_OPTIONS } from '@/lib/club-options'

export default function CompleteProfilePage() {
  const [signupFields, setSignupFields] = useState<SignupField[] | null>(null)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | string[]>>({})

  const fieldEnabled = (key: string) => {
    if (!signupFields) return false
    return signupFields.find(f => f.key === key)?.enabled ?? false
  }
  const fieldRequired = (key: string) => {
    if (!signupFields) return false
    return signupFields.find(f => f.key === key)?.required ?? false
  }

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    city: '',
    provinceState: '',
    postalZipCode: '',
    country: '',
    membershipLevel: '',
    howDidYouHear: '',
    statementOfInterest: '',
    interests: [] as string[],
    agreedToBylaws: false,
    agreedToGovernancePolicy: false,
    understandsApprovalProcess: false,
    agreedToElectronicInfo: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [orgDisplayName, setOrgDisplayName] = useState('')
  const [bylawsUrl, setBylawsUrl] = useState<string | null>(null)
  const [membershipPolicyUrl, setMembershipPolicyUrl] = useState<string | null>(null)
  const [feedbackUrl, setFeedbackUrl] = useState<string | null>(null)
  const [orgConfigReady, setOrgConfigReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    fetch('/api/org/config')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => {
        if (cancelled) return
        if (data.org?.name) setOrgDisplayName(data.org.displayName || data.org.name)
        if (data.org?.bylawsUrl) setBylawsUrl(data.org.bylawsUrl)
        if (data.org?.membershipPolicyUrl) setMembershipPolicyUrl(data.org.membershipPolicyUrl)
        if (data.org?.feedbackUrl) setFeedbackUrl(data.org.feedbackUrl)
        setSignupFields(
          Array.isArray(data.signupFields) && data.signupFields.length > 0
            ? data.signupFields
            : DEFAULT_SIGNUP_FIELDS.map(f => ({ ...f })),
        )
        setOrgConfigReady(true)
      })
      .catch(() => {
        if (!cancelled) {
          setSignupFields(DEFAULT_SIGNUP_FIELDS.map(f => ({ ...f })))
          setOrgConfigReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

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
              } catch {
                /* noop */
              }
              return []
            })()
            const rawCustom = p.custom_data
            const initialCustom: Record<string, string | string[]> = {}
            if (rawCustom && typeof rawCustom === 'object' && !Array.isArray(rawCustom)) {
              for (const [k, v] of Object.entries(rawCustom as Record<string, unknown>)) {
                if (Array.isArray(v)) initialCustom[k] = v.map(String)
                else if (v !== null && v !== undefined) initialCustom[k] = String(v)
              }
            }
            setCustomFieldValues(initialCustom)
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
              howDidYouHear: p.how_did_you_hear || '',
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
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleInterestChange = (interestValue: string, checked: boolean) => {
    setFormData(prev => {
      const current = prev.interests || []
      if (checked) return current.includes(interestValue) ? prev : { ...prev, interests: [...current, interestValue] }
      return { ...prev, interests: current.filter(i => i !== interestValue) }
    })
  }

  const handleCustomFieldChange = (key: string, value: string | string[]) =>
    setCustomFieldValues(p => ({ ...p, [key]: value }))

  const handleCustomCheckboxGroupChange = (key: string, option: string, checked: boolean) => {
    setCustomFieldValues(p => {
      const current = Array.isArray(p[key]) ? (p[key] as string[]) : []
      return { ...p, [key]: checked ? [...current, option] : current.filter(v => v !== option) }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    if (fieldEnabled('interests') && (!Array.isArray(formData.interests) || formData.interests.length === 0)) {
      setError('Please select at least one interest')
      setSaving(false)
      return
    }
    if (fieldEnabled('how_did_you_hear') && fieldRequired('how_did_you_hear') && !String(formData.howDidYouHear || '').trim()) {
      setError('Please tell us how you heard about us')
      setSaving(false)
      return
    }
    const customDefs = signupFields?.filter(f => f.isCustom && f.enabled) ?? []
    for (const f of customDefs) {
      if (!f.required) continue
      const v = customFieldValues[f.key]
      if (f.type === 'checkbox_group') {
        if (!Array.isArray(v) || v.length === 0) {
          setError(`Please complete: ${f.label}`)
          setSaving(false)
          return
        }
      } else if (f.type === 'boolean') {
        if (v !== 'true') {
          setError(`Please complete: ${f.label}`)
          setSaving(false)
          return
        }
      } else {
        const s = v === undefined || v === null ? '' : String(v)
        if (!s.trim()) {
          setError(`Please complete: ${f.label}`)
          setSaving(false)
          return
        }
      }
    }
    if (!orgConfigReady) {
      setError('Please wait for the form to finish loading.')
      setSaving(false)
      return
    }
    if (!formData.agreedToBylaws || !formData.agreedToGovernancePolicy || !formData.understandsApprovalProcess || !formData.agreedToElectronicInfo) {
      setError('Please accept all acknowledgements')
      setSaving(false)
      return
    }
    try {
      const body: Record<string, unknown> = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`.trim() || null,
        phone: formData.phone || null,
        street: formData.street || null,
        city: formData.city || null,
        province_state: formData.provinceState || null,
        postal_zip_code: formData.postalZipCode || null,
        country: formData.country || null,
        statement_of_interest: formData.statementOfInterest || null,
        how_did_you_hear: formData.howDidYouHear || null,
        interests: formData.interests,
      }
      const customPayload: Record<string, unknown> = {}
      for (const f of customDefs) {
        const v = customFieldValues[f.key]
        if (v === undefined) continue
        if (Array.isArray(v)) customPayload[f.key] = v
        else customPayload[f.key] = v
      }
      if (Object.keys(customPayload).length > 0) body.custom_data = customPayload

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update profile')
      setSuccess(true)
      setTimeout(async () => {
        try {
          const statusRes = await fetch('/api/stripe/status')
          const statusData = statusRes.ok ? await statusRes.json() : { enabled: false }
          router.push(statusData.enabled ? '/add-payment' : '/membership')
        } catch {
          router.push('/membership')
        }
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !orgConfigReady) return <Loading message="Loading..." fullScreen />

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
            Profile updated successfully! You will be redirected to continue membership setup.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input id="firstName" name="firstName" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.firstName} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input id="lastName" name="lastName" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.lastName} onChange={handleChange} />
              </div>
              {fieldEnabled('phone') && (
                <div className="md:col-span-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number {fieldRequired('phone') && <span className="text-red-500">*</span>}
                  </label>
                  <input id="phone" name="phone" type="tel" required={fieldRequired('phone')} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" placeholder="(555) 123-4567" value={formData.phone} onChange={handleChange} />
                </div>
              )}
            </div>
            {fieldEnabled('address') && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-3">Mailing Address</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street <span className="text-red-500">*</span></label>
                    <input id="street" name="street" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.street} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                      <input id="city" name="city" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.city} onChange={handleChange} />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
                      <select id="country" name="country" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.country} onChange={e => { handleChange(e); setFormData(prev => ({ ...prev, country: e.target.value, provinceState: '' })) }}>
                        {COUNTRIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="provinceState" className="block text-sm font-medium text-gray-700 mb-1">Province / State <span className="text-red-500">*</span></label>
                      <select id="provinceState" name="provinceState" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.provinceState} onChange={handleChange}>
                        {getStatesProvinces(formData.country).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="postalZipCode" className="block text-sm font-medium text-gray-700 mb-1">Postal / ZIP Code <span className="text-red-500">*</span></label>
                      <input id="postalZipCode" name="postalZipCode" type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.postalZipCode} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {formData.membershipLevel && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Membership</h2>
              <p className="text-sm text-gray-600">Your membership level: <strong className="text-gray-900">{formData.membershipLevel}</strong></p>
            </div>
          )}

          {fieldEnabled('statement_of_interest') && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Statement of Interest</h2>
              <label htmlFor="statementOfInterest" className="block text-sm font-medium text-gray-700 mb-1">
                Briefly describe your interest in joining.
                {fieldRequired('statement_of_interest') && <span className="text-red-500"> *</span>}
              </label>
              <textarea id="statementOfInterest" name="statementOfInterest" rows={4} required={fieldRequired('statement_of_interest')} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.statementOfInterest} onChange={handleChange} />
            </div>
          )}

          {fieldEnabled('interests') && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Interests</h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are your main interests? <span className="text-red-500">*</span>{' '}
                <span className="text-xs text-gray-500 font-normal">(Select all that apply)</span>
              </label>
              <div className="space-y-2">
                {COMMON_INTEREST_OPTIONS.map(interest => (
                  <label key={interest.value} className="flex items-center">
                    <input type="checkbox" name="interests" value={interest.value} checked={formData.interests.includes(interest.value)} onChange={e => handleInterestChange(interest.value, e.target.checked)} className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">{interest.label}</span>
                  </label>
                ))}
              </div>
              {formData.interests.length === 0 && <p className="mt-2 text-xs text-red-600">Please select at least one interest</p>}
            </div>
          )}

          {fieldEnabled('how_did_you_hear') && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
              <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 mb-1">
                {orgDisplayName ? `How did you hear about ${orgDisplayName}?` : 'How did you hear about us?'}
                {fieldRequired('how_did_you_hear') && <span className="text-red-500"> *</span>}
              </label>
              <select id="howDidYouHear" name="howDidYouHear" required={fieldRequired('how_did_you_hear')} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" value={formData.howDidYouHear} onChange={handleChange}>
                <option value="">Select...</option>
                <option value="friend">Friend/Colleague</option>
                <option value="social-media">Social Media</option>
                <option value="website">Website</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

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
                    {(field.options ?? []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
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

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acknowledgements</h2>
            {!orgConfigReady ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <div className="space-y-3">
                <label className="flex items-start">
                  <input type="checkbox" name="agreedToBylaws" required className="mt-1 mr-3 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" checked={formData.agreedToBylaws} onChange={handleChange} />
                  <span className="text-sm text-gray-700">
                    {bylawsUrl ? (
                      <>
                        I have reviewed and agree to the{' '}
                        <Link href={bylawsUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline hover:no-underline">
                          {orgDisplayName ? `${orgDisplayName} by-laws` : 'by-laws'}
                        </Link>.{' '}
                      </>
                    ) : (
                      <>I have reviewed and agree to this organization&apos;s governing documents (by-laws, constitution, or equivalent).{' '}</>
                    )}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <label className="flex items-start">
                  <input type="checkbox" name="agreedToGovernancePolicy" required className="mt-1 mr-3 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" checked={formData.agreedToGovernancePolicy} onChange={handleChange} />
                  <span className="text-sm text-gray-700">
                    {membershipPolicyUrl ? (
                      <>
                        I have reviewed and agree to the{' '}
                        <Link href={membershipPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline hover:no-underline">
                          {orgDisplayName ? `${orgDisplayName} membership terms and policies` : 'membership terms and policies'}
                        </Link>.{' '}
                      </>
                    ) : (
                      <>I have reviewed and agree to this organization&apos;s membership terms and policies.{' '}</>
                    )}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <label className="flex items-start">
                  <input type="checkbox" name="understandsApprovalProcess" required className="mt-1 mr-3 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" checked={formData.understandsApprovalProcess} onChange={handleChange} />
                  <span className="text-sm text-gray-700">I understand my application is subject to approval and does not create membership until approved <span className="text-red-500">*</span></span>
                </label>
                <label className="flex items-start">
                  <input type="checkbox" name="agreedToElectronicInfo" required className="mt-1 mr-3 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" checked={formData.agreedToElectronicInfo} onChange={handleChange} />
                  <span className="text-sm text-gray-700">I agree to receive information electronically (e.g. by email) <span className="text-red-500">*</span></span>
                </label>
                {feedbackUrl && (
                  <p className="text-sm text-gray-600 pt-1">
                    Questions or feedback about this application?{' '}
                    <Link href={feedbackUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline hover:no-underline">
                      Contact the club
                    </Link>.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={saving || !orgConfigReady} className="px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
