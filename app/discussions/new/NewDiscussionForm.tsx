'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DiscussionCategory } from '@/types/database'
import ThreadImageUpload from '@/components/ThreadImageUpload'
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, ALL_CATEGORIES, CATEGORY_PLACEHOLDERS } from '../constants'

// Structured fields for classified categories
interface ClassifiedFields {
  // Gear for Sale
  itemName?: string
  condition?: string
  price?: string
  location?: string
  contact?: string
  modelYear?: string
  hoursUsed?: string
  shippingAvailable?: string
  
  // Instructor Availability
  certifications?: string
  availability?: string
  rates?: string
  experience?: string
  specializations?: string
  aircraftTypes?: string
  baseLocation?: string
  
  // Aircraft Shares
  aircraftType?: string
  shareDetails?: string
  year?: string
  totalTime?: string
  engineTime?: string
  avionics?: string
  annualDue?: string
  monthlyFees?: string
  hangarLocation?: string
}

function NewDiscussionFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<DiscussionCategory>('other')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [classifiedFields, setClassifiedFields] = useState<ClassifiedFields>({})
  const [useStructuredForm, setUseStructuredForm] = useState(false)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  // Pre-fill category from URL parameter
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      if (ALL_CATEGORIES.includes(categoryParam as DiscussionCategory)) {
        setCategory(categoryParam as DiscussionCategory)
      }
    }
  }, [searchParams])

  // Check if category should use structured form
  useEffect(() => {
    const structuredCategories: DiscussionCategory[] = ['gear_for_sale', 'instructor_availability', 'aircraft_shares']
    setUseStructuredForm(structuredCategories.includes(category))
    if (!structuredCategories.includes(category)) {
      setClassifiedFields({})
    }
  }, [category])

  // Format structured fields into content
  const formatStructuredContent = (fields: ClassifiedFields, cat: DiscussionCategory): string => {
    if (cat === 'gear_for_sale') {
      let formatted = `**Item:** ${fields.itemName || ''}
**Condition:** ${fields.condition || ''}
**Price:** ${fields.price || ''}`
      
      if (fields.modelYear) formatted += `\n**Model/Year:** ${fields.modelYear}`
      if (fields.hoursUsed) formatted += `\n**Hours Used:** ${fields.hoursUsed}`
      if (fields.location) formatted += `\n**Location:** ${fields.location}`
      if (fields.shippingAvailable) formatted += `\n**Shipping:** ${fields.shippingAvailable}`
      
      formatted += `\n**Contact:** ${fields.contact || ''}`
      
      if (content) formatted += `\n\n${content}`
      return formatted
    } else if (cat === 'instructor_availability') {
      let formatted = `**Certifications:** ${fields.certifications || ''}
**Availability:** ${fields.availability || ''}
**Rates:** ${fields.rates || ''}`
      
      if (fields.experience) formatted += `\n**Experience:** ${fields.experience}`
      if (fields.specializations) formatted += `\n**Specializations:** ${fields.specializations}`
      if (fields.aircraftTypes) formatted += `\n**Aircraft Types:** ${fields.aircraftTypes}`
      if (fields.baseLocation) formatted += `\n**Base Location:** ${fields.baseLocation}`
      
      formatted += `\n**Contact:** ${fields.contact || ''}`
      
      if (content) formatted += `\n\n${content}`
      return formatted
    } else if (cat === 'aircraft_shares') {
      let formatted = `**Aircraft Type:** ${fields.aircraftType || ''}
**Share Details:** ${fields.shareDetails || ''}
**Pricing:** ${fields.price || ''}`
      
      if (fields.year) formatted += `\n**Year:** ${fields.year}`
      if (fields.totalTime) formatted += `\n**Total Time:** ${fields.totalTime}`
      if (fields.engineTime) formatted += `\n**Engine Time:** ${fields.engineTime}`
      if (fields.avionics) formatted += `\n**Avionics:** ${fields.avionics}`
      if (fields.annualDue) formatted += `\n**Annual Due:** ${fields.annualDue}`
      if (fields.monthlyFees) formatted += `\n**Monthly Fees:** ${fields.monthlyFees}`
      if (fields.location) formatted += `\n**Location:** ${fields.location}`
      if (fields.hangarLocation) formatted += `\n**Hangar:** ${fields.hangarLocation}`
      
      formatted += `\n**Contact:** ${fields.contact || ''}`
      
      if (content) formatted += `\n\n${content}`
      return formatted
    }
    return content
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Format content with structured fields if applicable
      const finalContent = useStructuredForm 
        ? formatStructuredContent(classifiedFields, category)
        : content

      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content: finalContent, category, image_urls: imageUrls }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create discussion')
      }

      router.push(`/discussions/${data.thread.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DiscussionCategory)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-transparent"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {CATEGORY_DESCRIPTIONS[category] && CATEGORY_DESCRIPTIONS[category] !== CATEGORY_LABELS[category] && (
          <p className="mt-2 text-sm text-gray-600">
            {CATEGORY_DESCRIPTIONS[category]}
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          {/* Community Guidelines - Subtle, grayed out, shows on hover/click */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsClicked(!isClicked)
                setShowGuidelines(!isClicked)
              }}
              onMouseEnter={() => !isClicked && setShowGuidelines(true)}
              onMouseLeave={() => !isClicked && setShowGuidelines(false)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Community Guidelines</span>
            </button>
            
            {showGuidelines && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-10">
                <p className="leading-relaxed">
                  <strong>Community Guidelines:</strong> Keep it respectful, practical, and aviation-focused. Posts may be moved or closed if needed.
                </p>
                <div className="absolute bottom-0 right-4 transform translate-y-full">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
          </div>
        </div>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-transparent"
          placeholder="Enter discussion title..."
        />
      </div>

      {/* Structured Form Fields for Classified Categories */}
      {useStructuredForm && category === 'gear_for_sale' && (
        <div className="mb-6 space-y-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-6 bg-[#0d1e26] rounded-full"></div>
            <h3 className="text-base font-semibold text-gray-900">Item Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="itemName"
                value={classifiedFields.itemName || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, itemName: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., Bose A20 Headset"
              />
            </div>
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                Condition <span className="text-red-500">*</span>
              </label>
              <select
                id="condition"
                value={classifiedFields.condition || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, condition: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
              >
                <option value="">Select condition...</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="price"
                value={classifiedFields.price || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, price: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., $500 or Best Offer"
              />
            </div>
            <div>
              <label htmlFor="modelYear" className="block text-sm font-medium text-gray-700 mb-2">
                Model/Year
              </label>
              <input
                type="text"
                id="modelYear"
                value={classifiedFields.modelYear || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, modelYear: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., A20, 2020"
              />
            </div>
            <div>
              <label htmlFor="hoursUsed" className="block text-sm font-medium text-gray-700 mb-2">
                Hours Used
              </label>
              <input
                type="text"
                id="hoursUsed"
                value={classifiedFields.hoursUsed || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, hoursUsed: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., 500 hours"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={classifiedFields.location || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, location: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., YTZ or Toronto"
              />
            </div>
            <div>
              <label htmlFor="shippingAvailable" className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Available
              </label>
              <select
                id="shippingAvailable"
                value={classifiedFields.shippingAvailable || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, shippingAvailable: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
              >
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Local pickup preferred">Local pickup preferred</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="contact"
                value={classifiedFields.contact || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, contact: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="Email or phone number"
              />
            </div>
          </div>
        </div>
      )}

      {useStructuredForm && category === 'instructor_availability' && (
        <div className="mb-6 space-y-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-6 bg-[#0d1e26] rounded-full"></div>
            <h3 className="text-base font-semibold text-gray-900">Instructor Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-2">
                Certifications <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="certifications"
                value={classifiedFields.certifications || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, certifications: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., CFI, CFII, MEI"
              />
            </div>
            <div>
              <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
                Availability <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="availability"
                value={classifiedFields.availability || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, availability: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., Weekends, Evenings"
              />
            </div>
            <div>
              <label htmlFor="rates" className="block text-sm font-medium text-gray-700 mb-2">
                Rates <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="rates"
                value={classifiedFields.rates || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, rates: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., $75/hour"
              />
            </div>
            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                Experience
              </label>
              <input
                type="text"
                id="experience"
                value={classifiedFields.experience || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, experience: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., 10+ years, 2000+ hours"
              />
            </div>
            <div>
              <label htmlFor="specializations" className="block text-sm font-medium text-gray-700 mb-2">
                Specializations
              </label>
              <input
                type="text"
                id="specializations"
                value={classifiedFields.specializations || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, specializations: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., IFR, Multi-engine, Tailwheel"
              />
            </div>
            <div>
              <label htmlFor="aircraftTypes" className="block text-sm font-medium text-gray-700 mb-2">
                Aircraft Types
              </label>
              <input
                type="text"
                id="aircraftTypes"
                value={classifiedFields.aircraftTypes || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, aircraftTypes: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., C172, PA28, C182"
              />
            </div>
            <div>
              <label htmlFor="baseLocation" className="block text-sm font-medium text-gray-700 mb-2">
                Base Location
              </label>
              <input
                type="text"
                id="baseLocation"
                value={classifiedFields.baseLocation || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, baseLocation: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., YTZ, CYTZ"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="contact"
                value={classifiedFields.contact || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, contact: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="Email or phone number"
              />
            </div>
          </div>
        </div>
      )}

      {useStructuredForm && category === 'aircraft_shares' && (
        <div className="mb-6 space-y-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-6 bg-[#0d1e26] rounded-full"></div>
            <h3 className="text-base font-semibold text-gray-900">Aircraft Share Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="aircraftType" className="block text-sm font-medium text-gray-700 mb-2">
                Aircraft Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="aircraftType"
                value={classifiedFields.aircraftType || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, aircraftType: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., C172, PA28"
              />
            </div>
            <div>
              <label htmlFor="shareDetails" className="block text-sm font-medium text-gray-700 mb-2">
                Share Details <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="shareDetails"
                value={classifiedFields.shareDetails || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, shareDetails: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., 1/8 share, Block time available"
              />
            </div>
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <input
                type="text"
                id="year"
                value={classifiedFields.year || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, year: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., 2015"
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Pricing <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="price"
                value={classifiedFields.price || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, price: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., $15,000 or $150/hour"
              />
            </div>
            <div>
              <label htmlFor="totalTime" className="block text-sm font-medium text-gray-700 mb-2">
                Total Time
              </label>
              <input
                type="text"
                id="totalTime"
                value={classifiedFields.totalTime || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, totalTime: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., 2500 hours"
              />
            </div>
            <div>
              <label htmlFor="engineTime" className="block text-sm font-medium text-gray-700 mb-2">
                Engine Time
              </label>
              <input
                type="text"
                id="engineTime"
                value={classifiedFields.engineTime || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, engineTime: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., 500 SMOH"
              />
            </div>
            <div>
              <label htmlFor="avionics" className="block text-sm font-medium text-gray-700 mb-2">
                Avionics
              </label>
              <input
                type="text"
                id="avionics"
                value={classifiedFields.avionics || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, avionics: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., Garmin G1000, IFR equipped"
              />
            </div>
            <div>
              <label htmlFor="annualDue" className="block text-sm font-medium text-gray-700 mb-2">
                Annual Due
              </label>
              <input
                type="text"
                id="annualDue"
                value={classifiedFields.annualDue || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, annualDue: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., March 2025"
              />
            </div>
            <div>
              <label htmlFor="monthlyFees" className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Fees
              </label>
              <input
                type="text"
                id="monthlyFees"
                value={classifiedFields.monthlyFees || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, monthlyFees: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., $200/month"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={classifiedFields.location || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, location: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., YTZ or nearby airport"
              />
            </div>
            <div>
              <label htmlFor="hangarLocation" className="block text-sm font-medium text-gray-700 mb-2">
                Hangar Location
              </label>
              <input
                type="text"
                id="hangarLocation"
                value={classifiedFields.hangarLocation || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, hangarLocation: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="e.g., YTZ Hangar 3"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="contact"
                value={classifiedFields.contact || ''}
                onChange={(e) => setClassifiedFields({ ...classifiedFields, contact: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] transition-all shadow-sm hover:shadow-md"
                placeholder="Email or phone number"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          {useStructuredForm ? 'Additional Details (Optional)' : 'Description'}
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required={!useStructuredForm}
          rows={useStructuredForm ? 5 : 10}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-transparent"
          placeholder={useStructuredForm ? 'Add any additional information...' : CATEGORY_PLACEHOLDERS[category]}
        />
      </div>

      <div className="mb-6">
        <ThreadImageUpload
          onImagesChange={setImageUrls}
          maxImages={5}
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Start Discussion'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function NewDiscussionForm() {
  return (
    <Suspense fallback={
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    }>
      <NewDiscussionFormContent />
    </Suspense>
  )
}
