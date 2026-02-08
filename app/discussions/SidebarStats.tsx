import { createClient } from '@/lib/supabase/server'

export default async function SidebarStats() {
  const supabase = await createClient()

  // Get total thread count
  const { data: threads } = await supabase
    .from('threads')
    .select('id', { count: 'exact', head: true })

  const totalCount = threads?.length || 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Statistics</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Hangar Talk</span>
          <span className="font-semibold text-gray-900">{totalCount}</span>
        </div>
      </div>
    </div>
  )
}
