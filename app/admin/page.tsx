import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  return <AdminDashboard />
}

