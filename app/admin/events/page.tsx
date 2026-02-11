import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'
import EventsPageClient from './EventsPageClient'

export default async function EventsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/membership')
  }

  return (
    <AdminLayout>
      <EventsPageClient />
    </AdminLayout>
  )
}
