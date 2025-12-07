import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getMembershipFee } from '@/lib/settings'
import PayPalButton from '@/components/PayPalButton'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const membershipFee = await getMembershipFee()
  const isPaid = user.profile.membership_level === 'paid'
  const isExpired = user.profile.membership_expires_at
    ? new Date(user.profile.membership_expires_at) < new Date()
    : false

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Welcome, {user.profile.full_name || user.profile.email}!
            </h1>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Membership Status
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Level:</span>
                    <span className={`font-medium ${
                      isPaid ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {user.profile.membership_level.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium text-gray-900">
                      {user.profile.role.toUpperCase()}
                    </span>
                  </div>
                  {user.profile.membership_expires_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span className={`font-medium ${
                        isExpired ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {new Date(user.profile.membership_expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription box hidden for now */}
              {false && !isPaid && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Upgrade to Paid Membership
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Unlock exclusive content and benefits with a paid membership.
                  </p>
                  <div className="border-t border-blue-200 pt-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Annual Membership: ${membershipFee.toFixed(2)}/year
                    </p>
                    <PayPalButton />
                  </div>
                </div>
              )}

              {isPaid && !isExpired && (
                <div className="bg-green-50 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Active Paid Membership
                  </h2>
                  <p className="text-sm text-gray-600">
                    Thank you for your support! You have access to all premium features.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Links
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <a
                  href="/resources"
                  className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition"
                >
                  <h3 className="font-medium text-gray-900">Resources</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Access member resources
                  </p>
                </a>
                {user.profile.role === 'admin' && (
                  <a
                    href="/admin"
                    className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition"
                  >
                    <h3 className="font-medium text-gray-900">Admin Panel</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage members and resources
                    </p>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

