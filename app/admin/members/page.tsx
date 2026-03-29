import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import AdminLayout from '@/components/AdminLayout'
import MembersPageClient from './MembersPageClient'
import { getOrgMemberProfileFieldFlags } from '@/lib/settings'

export default async function MembersPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/membership')
  }

  const profileFieldFlags = await getOrgMemberProfileFieldFlags()

  return (
    <AdminLayout>
      <MembersPageClient profileFieldFlags={profileFieldFlags} />
    </AdminLayout>
  )
}
