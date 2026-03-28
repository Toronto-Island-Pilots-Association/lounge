import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDiscussionCategories } from '@/lib/settings'
import DiscussionCategoriesForm from './DiscussionCategoriesForm'

export default async function PlatformDiscussionSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')

  const categories = await getDiscussionCategories(orgId)

  return (
    <div className="px-8 py-10">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Discussions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the categories members can use when posting discussions.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <DiscussionCategoriesForm initial={categories} orgId={orgId} />
        </div>
      </div>
    </div>
  )
}
