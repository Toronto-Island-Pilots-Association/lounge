'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DiscussionCategory } from '@/types/database'
import { CATEGORY_LABELS, CATEGORIES_WITH_ALL } from './constants'

const CATEGORY_LABELS_WITH_ALL: Record<DiscussionCategory | 'all', string> = {
  all: 'All Categories',
  ...CATEGORY_LABELS,
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
    router.push(`/discussions?${params.toString()}`, { scroll: false })
  }

  const selectedCategory = currentCategory || 'all'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-600">Category:</span>
      <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-wrap gap-1">
        {CATEGORIES_WITH_ALL.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-white text-[#0d1e26] shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {CATEGORY_LABELS_WITH_ALL[category]}
          </button>
        ))}
      </div>
    </div>
  )
}
