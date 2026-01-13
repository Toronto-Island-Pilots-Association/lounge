import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'
import ResourcesPageClient from './ResourcesPageClient'

export default async function ResourcesPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  return (
    <AdminLayout>
      <ResourcesPageClient />
    </AdminLayout>
  )
}
