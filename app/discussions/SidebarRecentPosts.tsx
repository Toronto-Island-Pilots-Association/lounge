import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DiscussionCategory } from '@/types/database'
import { ALL_CATEGORIES } from './constants'
import CategoryIcon from './CategoryIcons'
import { formatRelativeDate } from './utils'

export default async function SidebarRecentPosts() {
  const supabase = await createClient()

  // Get recent threads for sidebar
  const { data: recentThreads } = await supabase
    .from('threads')
    .select('id, title, category, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // Helper to safely get category icon
  const getCategoryIcon = (category: string) => {
    if (ALL_CATEGORIES.includes(category as DiscussionCategory)) {
      return <CategoryIcon category={category as DiscussionCategory} className="w-4 h-4" />
    }
    return <CategoryIcon category="other" className="w-4 h-4" />
  }

  if (!recentThreads || recentThreads.length === 0) {
    return null
  }

  return (
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
                  {formatRelativeDate(thread.created_at)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
