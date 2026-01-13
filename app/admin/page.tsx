import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  // Redirect to members page by default
  redirect('/admin/members')
}

