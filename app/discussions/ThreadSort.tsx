'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function ThreadSort() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSort = searchParams.get('sort') || 'latest'
  const [sortBy, setSortBy] = useState(initialSort)

  // Sync with URL params when they change externally
  // Use useLayoutEffect to avoid setState warning, or better: initialize from URL
  const currentSortFromUrl = searchParams.get('sort') || 'latest'
  useEffect(() => {
    if (currentSortFromUrl !== sortBy) {
      // Use setTimeout to avoid setState in effect warning
      setTimeout(() => setSortBy(currentSortFromUrl), 0)
    }
  }, [currentSortFromUrl, sortBy])

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort)
    const params = new URLSearchParams(searchParams.toString())
    if (newSort === 'latest') {
      params.delete('sort')
    } else {
      params.set('sort', newSort)
    }
    router.push(`/discussions?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Sort by:</span>
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => handleSortChange('latest')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            sortBy === 'latest'
              ? 'bg-white text-[#0d1e26] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Latest
        </button>
        <button
          onClick={() => handleSortChange('hot')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            sortBy === 'hot'
              ? 'bg-white text-[#0d1e26] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Hot
        </button>
      </div>
    </div>
  )
}
