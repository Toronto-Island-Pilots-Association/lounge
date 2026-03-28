import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MembershipLevelsForm from './MembershipLevelsForm'

export default async function PlatformMembershipSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')

  return (
    <div className="px-8 py-10">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Membership</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure membership tiers, annual fees, and optional trial periods for this lounge.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <MembershipLevelsForm orgId={orgId} />
        </div>
      </div>
    </div>
  )
}
