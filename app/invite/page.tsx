import { redirect } from 'next/navigation'
import { getCurrentUserIncludingPending, shouldRequireProfileCompletion, shouldRequirePayment } from '@/lib/auth'
import InviteMemberForm from './InviteMemberForm'

export default async function InvitePage() {
  const user = await getCurrentUserIncludingPending()

  if (!user) {
    redirect('/login')
  }

  if (shouldRequireProfileCompletion(user.profile)) {
    redirect('/complete-profile')
  }

  if (shouldRequirePayment(user.profile)) {
    redirect('/add-payment')
  }

  // Only approved members can invite
  const isPending = user.profile.status === 'pending' && user.profile.role !== 'admin'
  const isRejected = user.profile.status === 'rejected' && user.profile.role !== 'admin'
  const isExpiredStatus = user.profile.status === 'expired' && user.profile.role !== 'admin'

  if (isPending || isRejected || isExpiredStatus) {
    redirect('/membership')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Invite a Member
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Invite someone to join TIPA.
          </p>
          <InviteMemberForm />
        </div>
      </div>
    </div>
  )
}
