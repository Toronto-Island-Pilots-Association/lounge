'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DiscussionCategory } from '@/types/database'

const CATEGORY_LABELS: Record<DiscussionCategory | 'all', string> = {
  all: 'All Categories',
  aircraft_shares: 'Aircraft Shares / Block Time',
  instructor_availability: 'Instructor Availability',
  gear_for_sale: 'Gear for Sale',
  other: 'Other',
}

export default function CategoryFilter({ currentCategory }: { currentCategory?: DiscussionCategory | 'all' }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryChange = (category: DiscussionCategory | 'all') => {
    const params = new URLSearchParams(searchParams.toString())
    if (category === 'all') {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    // Preserve sort parameter
    router.push(`/discussions?${params.toString()}`)
  }

  const categories: (DiscussionCategory | 'all')[] = ['all', 'aircraft_shares', 'instructor_availability', 'gear_for_sale', 'other']
  const selectedCategory = currentCategory || 'all'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-600">Category:</span>
      <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-wrap gap-1">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-white text-[#0d1e26] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>
    </div>
  )
}
