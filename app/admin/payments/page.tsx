import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'
import PaymentsPageClient from './PaymentsPageClient'

export default async function PaymentsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  return (
    <AdminLayout>
      <PaymentsPageClient />
    </AdminLayout>
  )
}
