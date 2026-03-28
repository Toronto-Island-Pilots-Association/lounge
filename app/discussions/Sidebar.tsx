import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { DiscussionCategory } from '@/types/database'
import SortButtons from './SortButtons'
import CategoryIcon from './CategoryIcons'
import { OrgCategoryConfig } from './constants'

// Component to render a list of categories
function CategorySection({
  categories,
  categoryLabels,
  currentCategory,
  currentSort,
  title
}: {
  categories: DiscussionCategory[]
  categoryLabels: Record<DiscussionCategory, string>
  currentCategory?: DiscussionCategory | 'all'
  currentSort?: string
  title: string
}) {
  const selectedCategory = currentCategory || 'all'
  const sortBy = currentSort || 'latest'

  return (
    <nav className="space-y-0.5">
      {categories.map((category) => {
        const isActive = selectedCategory === category
        
        return (
          <Link
            key={category}
            href={`/discussions?category=${category}&sort=${sortBy}`}
            prefetch={true}
            className={`group flex flex-col px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
              isActive
                ? 'bg-[#0d1e26] text-white font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-base flex-shrink-0">
                  <CategoryIcon category={category} className="w-4 h-4" />
                </span>
                <span className="truncate">
                  {categoryLabels[category]}
                </span>
              </div>
              <Suspense fallback={
                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse ${
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
  )
}

// Static category list component - always visible, links work immediately
function CategoryList({ currentCategory, currentSort, categoryConfig }: { currentCategory?: DiscussionCategory | 'all', currentSort?: string, categoryConfig: OrgCategoryConfig }) {
  const sortBy = currentSort || 'latest'

  return (
    <div className="space-y-6">
      {/* Sort Buttons */}
      <SortButtons currentCategory={currentCategory} currentSort={sortBy} />

      {/* Discussions Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Discussions</h3>
        <CategorySection
          categories={categoryConfig.discussionCategories}
          categoryLabels={categoryConfig.categoryLabels}
          currentCategory={currentCategory}
          currentSort={sortBy}
          title="Discussions"
        />
      </div>

      {/* Classifieds Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Classifieds</h3>
        <CategorySection
          categories={categoryConfig.classifiedCategories}
          categoryLabels={categoryConfig.categoryLabels}
          currentCategory={currentCategory}
          currentSort={sortBy}
          title="Classifieds"
        />
      </div>
    </div>
  )
}

// Component that fetches all category counts in one query and returns the count for a specific category
async function CategoryCount({ category, isActive }: { category: DiscussionCategory | 'all', isActive: boolean }) {
  const supabase = await createClient()
  const orgId = (await headers()).get('x-org-id')

  // Fetch all threads once to get all counts
  const { data: threads } = await supabase
    .from('threads')
    .select('category')
    .eq('org_id', orgId ?? '')

  let count = 0
  if (category === 'all') {
    count = threads?.length || 0
  } else {
    count = threads?.filter((t: { category: string }) => t.category === category).length || 0
  }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
      isActive
        ? 'bg-white/20 text-white'
        : 'bg-gray-100 text-gray-600'
    }`}>
      {count}
    </span>
  )
}


export default function Sidebar({ currentCategory, currentSort, categoryConfig }: { currentCategory?: DiscussionCategory | 'all', currentSort?: string, categoryConfig: OrgCategoryConfig }) {
  return (
    <div className="space-y-6">
      {/* Categories - Links always visible, counts load separately */}
      <CategoryList currentCategory={currentCategory} currentSort={currentSort} categoryConfig={categoryConfig} />
    </div>
  )
}
