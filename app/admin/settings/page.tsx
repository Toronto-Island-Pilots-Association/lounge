import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'

export default async function SettingsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">
          <p>No settings available at this time.</p>
        </div>
      </div>
    </AdminLayout>
  )
}
