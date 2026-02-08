'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DiscussionCategory } from '@/types/database'

interface SortButtonsProps {
  currentCategory?: DiscussionCategory | 'all'
  currentSort?: string
}

export default function SortButtons({ currentCategory, currentSort }: SortButtonsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sortBy = currentSort || 'latest'

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams()
    
    // Update sort parameter
    if (newSort === 'latest') {
      params.delete('sort')
    } else {
      params.set('sort', newSort)
    }
    
    // Don't preserve category - Latest and Popular show all discussions
    params.delete('category')
    
    router.push(`/discussions?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <nav className="space-y-1">
        <button
          onClick={() => handleSortChange('latest')}
          className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 w-full ${
            sortBy === 'latest' || !sortBy
              ? 'bg-[#0d1e26] text-white font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-base flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <span className="flex-1 text-left">Latest</span>
        </button>
        <button
          onClick={() => handleSortChange('hot')}
          className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 w-full ${
            sortBy === 'hot'
              ? 'bg-[#0d1e26] text-white font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-base flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
          </span>
          <span className="flex-1 text-left">Popular</span>
        </button>
      </nav>
    </div>
  )
}
