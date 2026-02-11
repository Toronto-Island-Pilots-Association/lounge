import { getCurrentUserIncludingPending } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SignOutButton from './SignOutButton'

export default async function PendingApprovalPage() {
  const user = await getCurrentUserIncludingPending()

  // If not logged in, redirect to login
  if (!user) {
    redirect('/login')
  }

  // If user is approved or is admin, redirect to membership
  if (user.profile.status === 'approved' || user.profile.role === 'admin') {
    redirect('/membership')
  }

  const isRejected = user.profile.status === 'rejected'
  const isExpired = user.profile.status === 'expired'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          {isExpired ? (
            <svg className="mx-auto h-16 w-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : isRejected ? (
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isExpired ? 'Membership Expired' : isRejected ? 'Account Rejected' : 'Membership Pending Approval'}
        </h1>
        {isExpired ? (
          <>
            <p className="text-gray-600 mb-6">
              Your membership has lapsed due to non-payment. You do not have access to TIPA platform features.
            </p>
            <p className="text-sm text-gray-500">
              To restore access, please renew your membership or contact an administrator.
            </p>
          </>
        ) : isRejected ? (
          <>
            <p className="text-gray-600 mb-6">
              Your account application has been rejected. You do not have access to TIPA platform features.
            </p>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact an administrator.
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              Thank you for applying for membership with TIPA! Your membership application is currently pending review by an administrator.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-blue-900 mb-2">
                <strong>What happens next:</strong>
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Once approved, you will be registered as an <strong>Associate member</strong> until <strong>October 1st</strong></li>
                <li>Your access to the platform may be revoked if you do not pay your membership fees after that date</li>
              </ul>
            </div>
            <p className="text-sm text-gray-500">
              You will receive access to the platform once your account has been approved. This usually takes 1-2 business days.
            </p>
          </>
        )}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}

