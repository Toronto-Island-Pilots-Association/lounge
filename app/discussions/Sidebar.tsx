import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DiscussionCategory } from '@/types/database'
import SidebarRecentPosts from './SidebarRecentPosts'
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, CATEGORY_ICONS, CATEGORIES_WITH_ALL, ALL_CATEGORIES } from './constants'

// Static category list component - always visible, links work immediately
function CategoryList({ currentCategory }: { currentCategory?: DiscussionCategory | 'all' }) {
  const selectedCategory = currentCategory || 'all'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Categories</h3>
      <nav className="space-y-1">
        {CATEGORIES_WITH_ALL.map((category) => {
          const isActive = selectedCategory === category
          
          return (
            <Link
              key={category}
              href={category === 'all' ? '/discussions' : `/discussions?category=${category}`}
              prefetch={true}
              className={`group flex flex-col px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[#0d1e26] text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {category !== 'all' && (
                    <span className="text-base flex-shrink-0">
                      {CATEGORY_ICONS[category]}
                    </span>
                  )}
                  <span className="truncate">
                    {category === 'all' ? 'All Categories' : CATEGORY_LABELS[category]}
                  </span>
                </div>
                <Suspense fallback={
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    ...
                  </span>
                }>
                  <CategoryCount category={category} isActive={isActive} />
                </Suspense>
              </div>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

// Component that fetches all category counts in one query and returns the count for a specific category
async function CategoryCount({ category, isActive }: { category: DiscussionCategory | 'all', isActive: boolean }) {
  const supabase = await createClient()
  
  // Fetch all threads once to get all counts
  const { data: threads } = await supabase
    .from('threads')
    .select('category')

  let count = 0
  if (category === 'all') {
    count = threads?.length || 0
  } else {
    count = threads?.filter((t: { category: string }) => t.category === category).length || 0
  }

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
      isActive
        ? 'bg-white/20 text-white'
        : 'bg-gray-100 text-gray-600'
    }`}>
      {count}
    </span>
  )
}


export default function Sidebar({ currentCategory }: { currentCategory?: DiscussionCategory | 'all' }) {
  return (
    <div className="space-y-6">
      {/* Categories - Links always visible, counts load separately */}
      <CategoryList currentCategory={currentCategory} />

      {/* Recent Posts - Loads separately */}
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Recent Posts</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      }>
        <SidebarRecentPosts />
      </Suspense>
    </div>
  )
}
