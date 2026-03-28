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
    <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-2xl min-w-0">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Discussions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the categories members can use when posting discussions.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <DiscussionCategoriesForm initial={categories} orgId={orgId} />
        </div>
      </div>
    </div>
  )
}
