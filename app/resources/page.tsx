'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Resource, ResourceCategory } from '@/types/database'
import Loading from '@/components/Loading'

// Helper function to strip HTML and truncate text for preview
function truncateText(html: string | null, maxLength: number = 150): string {
  if (!html) return ''
  
  // Strip HTML tags
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  
  if (text.length <= maxLength) return text
  
  return text.substring(0, maxLength).trim() + '...'
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Resource['category'] | 'all'>('all')
  const router = useRouter()

  useEffect(() => {
    checkUserStatus()
    loadResources()
  }, [])

  const checkUserStatus = async () => {
    try {
      const response = await fetch('/api/profile')
      if (!response.ok) {
        router.push('/login')
        return
      }

      const data = await response.json()
      const profile = data.profile

      if (profile && profile.status !== 'approved' && profile.role !== 'admin') {
        router.push('/pending-approval')
        return
      }
    } catch (error) {
      console.error('Error checking user status:', error)
      router.push('/login')
    }
  }

  const loadResources = async () => {
    try {
      const response = await fetch('/api/resources')
      if (response.ok) {
        const data = await response.json()
        setResources(data.resources || [])
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter resources based on search query and category
  const filteredResources = useMemo(() => {
    let filtered = resources

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((resource) => resource.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((resource) => {
        const title = resource.title.toLowerCase()
        const content = truncateText(resource.content || resource.description, 1000).toLowerCase()
        return title.includes(query) || content.includes(query)
      })
    }

    return filtered
  }, [resources, searchQuery, selectedCategory])

  // Get unique categories from resources for filter options
  const categories = useMemo(() => {
    const uniqueCategories = new Set<Resource['category']>()
    resources.forEach((resource) => {
      uniqueCategories.add(resource.category)
    })
    return Array.from(uniqueCategories).sort()
  }, [resources])

  const getCategoryLabel = (category: Resource['category']): string => {
    const labels: Record<Resource['category'], string> = {
      cytz: 'CYTZ',
      general_aviation: 'General Aviation',
      tipa: 'TIPA',
      aviation_news: 'Aviation News',
      other: 'Other',
    }
    return labels[category] || category
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-16 sm:pt-24">
            <Loading message="Loading resources..." />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Resources</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Access all available resources for members
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#0d1e26] focus:border-[#0d1e26] text-gray-900"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#0d1e26] text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-[#0d1e26] text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {getCategoryLabel(category)}
                </button>
              ))}
            </div>
          )}
        </div>

        {!resources || resources.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500">No resources available yet.</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500">No resources found matching your search.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredResources.map((resource) => {
                const isExternalLink = resource.url && resource.url.trim() !== ''
                const previewText = truncateText(resource.content || resource.description, 200)
                
                const ResourceRow = (
                  <div className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Thumbnail - Full width on mobile, fixed width on desktop */}
                      <div className="relative w-full sm:w-24 md:w-32 h-48 sm:h-24 md:h-32 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                        {resource.image_url ? (
                          <Image
                            src={resource.image_url}
                            alt={resource.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 96px, 128px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
                          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 flex-1">
                            {resource.title}
                          </h3>
                          {isExternalLink && (
                            <svg
                              className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          )}
                        </div>
                        
                        {previewText && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {previewText}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span>
                            {new Date(resource.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="px-2 py-0.5 bg-[#0d1e26] text-white rounded font-medium">
                            {getCategoryLabel(resource.category)}
                          </span>
                          {resource.file_url && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <span>Attachment</span>
                            </span>
                          )}
                          {isExternalLink && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                              External Link
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )

                if (isExternalLink) {
                  return (
                    <a
                      key={resource.id}
                      href={resource.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {ResourceRow}
                    </a>
                  )
                }

                return (
                  <Link key={resource.id} href={`/resources/${resource.id}`} className="block">
                    {ResourceRow}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

