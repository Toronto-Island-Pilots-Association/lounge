import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'
import AnalyticsPageClient from './AnalyticsPageClient'

export default async function AnalyticsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/membership')
  }

  return (
    <AdminLayout>
      <AnalyticsPageClient />
    </AdminLayout>
  )
}
