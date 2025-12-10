'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function ThreadSort() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'latest')

  useEffect(() => {
    const currentSort = searchParams.get('sort') || 'latest'
    setSortBy(currentSort)
  }, [searchParams])

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort)
    const params = new URLSearchParams(searchParams.toString())
    if (newSort === 'latest') {
      params.delete('sort')
    } else {
      params.set('sort', newSort)
    }
    router.push(`/discussion?${params.toString()}`)
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

