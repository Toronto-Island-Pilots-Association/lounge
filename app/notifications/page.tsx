import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.profile.status !== 'approved' && user.profile.role !== 'admin') {
    redirect('/pending-approval')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
        <NotificationsClient />
      </div>
    </div>
  )
}
