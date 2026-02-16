import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'
import SettingsPageClient from './SettingsPageClient'

export default async function SettingsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/membership')
  }

  return (
    <AdminLayout>
      <SettingsPageClient />
    </AdminLayout>
  )
}
