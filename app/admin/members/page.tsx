import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'
import MembersPageClient from './MembersPageClient'

export default async function MembersPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  return (
    <AdminLayout>
      <MembersPageClient />
    </AdminLayout>
  )
}
