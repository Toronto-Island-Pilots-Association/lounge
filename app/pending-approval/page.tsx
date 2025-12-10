import { getCurrentUserIncludingPending } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SignOutButton from './SignOutButton'

export default async function PendingApprovalPage() {
  const user = await getCurrentUserIncludingPending()

  // If not logged in, redirect to login
  if (!user) {
    redirect('/login')
  }

  // If user is approved or is admin, redirect to dashboard
  if (user.profile.status === 'approved' || user.profile.role === 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Account Pending Approval
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for joining TIPA! Your account is currently pending review by an administrator.
        </p>
        <p className="text-sm text-gray-500">
          You will receive access to the platform once your account has been approved. This usually takes 1-2 business days.
        </p>
        <div className="mt-8 pt-6 border-t border-gray-200">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}

