import { redirect } from 'next/navigation'
import { getCurrentUserIncludingPending, shouldRequireProfileCompletion } from '@/lib/auth'
import SubscriptionSection from '@/components/SubscriptionSection'

export default async function AddPaymentPage() {
  const user = await getCurrentUserIncludingPending()

  if (!user) {
    redirect('/login?redirectTo=%2Fadd-payment')
  }

  if (shouldRequireProfileCompletion(user.profile)) {
    redirect('/complete-profile')
  }

  const hasSubscription = !!user.profile.stripe_subscription_id
  const isHonorary = user.profile.membership_level === 'Honorary'

  if (hasSubscription || isHonorary) {
    redirect('/membership')
  }

  const isPending = user.profile.status === 'pending'

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Add your payment information
          </h1>
          <p className="mt-2 text-gray-600">
            You need to add a payment method before you can access the rest of the lounge features.
            {isPending
              ? ' You will not be charged until your application is approved by an admin. If approved before the trial period (e.g. September 1st), your first charge will be at the end of the trial.'
              : ' You will not be charged until the end of your trial period (e.g. September 1st). Set up your payment method now so your access continues without interruption.'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <SubscriptionSection user={user} embedded={false} />
          </div>
          
        </div>
      </div>
    </div>
  )
}
