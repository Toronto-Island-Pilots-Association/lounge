'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { DiscussionCategory } from '@/types/database'

const CATEGORY_LABELS: Record<DiscussionCategory, string> = {
  aircraft_shares: 'Aircraft Shares',
  instructor_availability: 'Instructors',
  gear_for_sale: 'Gear',
  other: 'Other',
}

const CATEGORY_ICONS: Record<DiscussionCategory, string> = {
  aircraft_shares: '✈️',
  instructor_availability: '👨‍✈️',
  gear_for_sale: '🛒',
  other: '📋',
}

export default function MobileFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSort = searchParams.get('sort') || 'latest'
  const currentCategory = searchParams.get('category') || 'all'
  const [sortBy, setSortBy] = useState(currentSort)
  const [category, setCategory] = useState<DiscussionCategory | 'all'>(currentCategory as DiscussionCategory | 'all')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync with URL params
  useEffect(() => {
    const sortFromUrl = searchParams.get('sort') || 'latest'
    const categoryFromUrl = searchParams.get('category') || 'all'
    if (sortFromUrl !== sortBy) setSortBy(sortFromUrl)
    if (categoryFromUrl !== category) setCategory(categoryFromUrl as DiscussionCategory | 'all')
  }, [searchParams, sortBy, category])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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

  const handleCategoryChange = (newCategory: DiscussionCategory | 'all') => {
    setCategory(newCategory)
    const params = new URLSearchParams(searchParams.toString())
    if (newCategory === 'all') {
      params.delete('category')
    } else {
      params.set('category', newCategory)
    }
    // Preserve sort
    if (searchParams.get('sort')) {
      params.set('sort', searchParams.get('sort')!)
    }
    router.push(`/discussions?${params.toString()}`)
    setIsOpen(false)
  }

  const categories: (DiscussionCategory | 'all')[] = ['all', 'aircraft_shares', 'instructor_availability', 'gear_for_sale', 'other']

  return (
    <div className="lg:hidden relative" ref={dropdownRef}>
      {/* Mobile Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto min-w-[140px]"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="truncate">
            {category === 'all' 
              ? 'All Categories' 
              : `${CATEGORY_ICONS[category]} ${CATEGORY_LABELS[category]}`}
          </span>
        </div>
        <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Mobile Filter Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:right-auto sm:min-w-[280px] mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 space-y-4">
            {/* Categories */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      category === cat
                        ? 'bg-[#0d1e26] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat !== 'all' && <span className="text-base">{CATEGORY_ICONS[cat]}</span>}
                    <span className="truncate">{cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Sort By
              </label>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    handleSortChange('latest')
                    setIsOpen(false)
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    sortBy === 'latest'
                      ? 'bg-white text-[#0d1e26] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Latest
                </button>
                <button
                  onClick={() => {
                    handleSortChange('hot')
                    setIsOpen(false)
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    sortBy === 'hot'
                      ? 'bg-white text-[#0d1e26] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
