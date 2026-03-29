import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'
import PagesPageClient from './PagesPageClient'

export default async function AdminPagesPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/membership')
  }

  return (
    <AdminLayout>
      <PagesPageClient />
    </AdminLayout>
  )
}
