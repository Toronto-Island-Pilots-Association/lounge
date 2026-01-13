import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DiscussionCategory } from '@/types/database'

const CATEGORY_LABELS: Record<DiscussionCategory, string> = {
  aircraft_shares: 'Aircraft Shares / Block Time',
  instructor_availability: 'Instructor Availability',
  gear_for_sale: 'Gear for Sale',
  lounge_feedback: 'Lounge Feedback',
  other: 'Other',
}

const CATEGORY_ICONS: Record<DiscussionCategory, string> = {
  aircraft_shares: '✈️',
  instructor_availability: '👨‍✈️',
  gear_for_sale: '🛒',
  lounge_feedback: '💬',
  other: '📋',
}

export default async function Sidebar({ currentCategory }: { currentCategory?: DiscussionCategory | 'all' }) {
  const supabase = await createClient()

  // Get category counts
  const { data: threads } = await supabase
    .from('threads')
    .select('category')

  const categoryCounts = new Map<DiscussionCategory | 'all', number>()
  categoryCounts.set('all', threads?.length || 0)
  
  const validCategories: DiscussionCategory[] = ['aircraft_shares', 'instructor_availability', 'gear_for_sale', 'lounge_feedback', 'other']
  
  threads?.forEach(thread => {
    const category = thread.category as string
    if (validCategories.includes(category as DiscussionCategory)) {
      const typedCategory = category as DiscussionCategory
      const count = categoryCounts.get(typedCategory) || 0
      categoryCounts.set(typedCategory, count + 1)
    }
  })

  // Get recent threads for sidebar
  const { data: recentThreads } = await supabase
    .from('threads')
    .select('id, title, category, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const categories: (DiscussionCategory | 'all')[] = ['all', 'aircraft_shares', 'instructor_availability', 'gear_for_sale', 'lounge_feedback', 'other']
  const selectedCategory = currentCategory || 'all'
  
  // Helper to safely get category icon
  const getCategoryIcon = (category: string): string => {
    if (validCategories.includes(category as DiscussionCategory)) {
      return CATEGORY_ICONS[category as DiscussionCategory]
    }
    return '📋'
  }

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Categories</h3>
        <nav className="space-y-1">
          {categories.map((category) => {
            const isActive = selectedCategory === category
            const count = categoryCounts.get(category) || 0
            
            return (
              <Link
                key={category}
                href={category === 'all' ? '/discussions' : `/discussions?category=${category}`}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-[#0d1e26] text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {category !== 'all' && (
                    <span className="text-base">{CATEGORY_ICONS[category]}</span>
                  )}
                  <span>
                    {category === 'all' ? 'All Categories' : CATEGORY_LABELS[category]}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Recent Activity */}
      {recentThreads && recentThreads.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Recent Posts</h3>
          <div className="space-y-3">
            {recentThreads.map((thread) => (
              <Link
                key={thread.id}
                href={`/discussions/${thread.id}`}
                className="block group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0 mt-0.5">
                    {getCategoryIcon(thread.category)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 group-hover:text-[#0d1e26] line-clamp-2 font-medium transition-colors">
                      {thread.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(thread.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Statistics</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Discussions</span>
            <span className="font-semibold text-gray-900">{categoryCounts.get('all') || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
