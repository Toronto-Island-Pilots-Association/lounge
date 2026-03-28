import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, shouldRequireProfileCompletion, shouldRequirePayment, isOrgStripeConnected } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DiscussionCategory } from '@/types/database'
import EditDiscussionForm from '../EditDiscussionForm'

export default async function EditThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [user, orgStripeConnected] = await Promise.all([getCurrentUser(), isOrgStripeConnected()])
  if (!user) redirect('/login')
  if (shouldRequireProfileCompletion(user.profile)) redirect('/complete-profile')
  if (shouldRequirePayment(user.profile) && orgStripeConnected) redirect('/add-payment')
  if (user.profile.status !== 'approved' && user.profile.role !== 'admin') {
    redirect('/pending-approval')
  }

  const { id } = await params
  const supabase = await createClient()
  const { data: thread, error } = await supabase
    .from('threads')
    .select('*')
    .eq('id', id)
    .eq('org_id', user.profile.org_id)
    .single()

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Discussion Not Found</h2>
            <Link
              href="/discussions"
              className="inline-block px-6 py-2 bg-[#0d1e26] text-white font-semibold rounded-lg"
            >
              Back to Hangar Talk
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = thread.created_by === user.id
  if (!isOwner) {
    redirect(`/discussions/${id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <Link
            href={`/discussions/${id}`}
            className="text-[#0d1e26] hover:text-[#0a171c] text-sm font-medium inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to discussion
          </Link>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Edit discussion</h1>
        <EditDiscussionForm
          threadId={id}
          initialTitle={thread.title}
          initialContent={thread.content}
          initialCategory={(thread.category as DiscussionCategory) || 'other'}
          initialImageUrls={thread.image_urls ?? []}
        />
      </div>
    </div>
  )
}
