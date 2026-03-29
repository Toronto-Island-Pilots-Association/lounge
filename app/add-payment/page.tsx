import { redirect } from 'next/navigation'
import {
  getCurrentUserIncludingPending,
  shouldRequireProfileCompletion,
  shouldRequirePayment,
  isOrgStripeConnected,
} from '@/lib/auth'
import SubscriptionSection from '@/components/SubscriptionSection'

export default async function AddPaymentPage() {
  const user = await getCurrentUserIncludingPending()

  if (!user) {
    redirect('/login?redirectTo=%2Fadd-payment')
  }

  if (shouldRequireProfileCompletion(user.profile)) {
    redirect('/complete-profile')
  }

  const hasSubscription =
    !!user.profile.stripe_subscription_id ||
    !!user.profile.paypal_subscription_id ||
    !!(user.profile.membership_expires_at && new Date(user.profile.membership_expires_at) >= new Date())
  const isHonorary = user.profile.membership_level === 'Honorary'

  if (hasSubscription || isHonorary) {
    redirect('/membership')
  }

  const orgStripeReady = await isOrgStripeConnected()
  if (shouldRequirePayment(user.profile) && !orgStripeReady) {
    redirect('/membership')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Add your payment information
          </h1>
          <p className="mt-2 text-gray-600">
            Add a payment method to access lounge features. You won’t be charged until you’re approved or, if your plan includes one, when your trial ends.
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
