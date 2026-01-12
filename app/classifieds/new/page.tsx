'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClassifiedCategory } from '@/types/database'

const CATEGORY_LABELS: Record<ClassifiedCategory, string> = {
  aircraft_shares: 'Aircraft Shares / Block Time',
  instructor_availability: 'Instructor Availability',
  gear_for_sale: 'Gear for Sale',
  lounge_feedback: 'Lounge Feedback',
  other: 'Other',
}

function NewClassifiedForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<ClassifiedCategory>('other')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill category from URL parameter
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      const validCategories: ClassifiedCategory[] = ['aircraft_shares', 'instructor_availability', 'gear_for_sale', 'lounge_feedback', 'other']
      if (validCategories.includes(categoryParam as ClassifiedCategory)) {
        setCategory(categoryParam as ClassifiedCategory)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content, category }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create classified')
      }

      router.push(`/classifieds/${data.thread.id}`)
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
              onChange={(e) => setCategory(e.target.value as ClassifiedCategory)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-transparent"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-transparent"
              placeholder="Enter classified title..."
            />
          </div>

          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-transparent"
              placeholder="Describe your classified ad..."
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Classified'}
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

export default function NewClassifiedPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Classified</h1>
          <p className="mt-2 text-gray-600">
            Post a new classified ad to the TIPA community
          </p>
        </div>

        {/* Community Guidelines Disclaimer */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 rounded-r-md p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong className="text-gray-900">Community Guidelines:</strong> Please maintain a respectful and professional environment. 
                Harassment, discrimination, or sharing sensitive personal information is not permitted. 
                All classifieds should be conducted with mutual respect and consideration for fellow members.
              </p>
            </div>
          </div>
        </div>

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
          <NewClassifiedForm />
        </Suspense>
      </div>
    </div>
  )
}
