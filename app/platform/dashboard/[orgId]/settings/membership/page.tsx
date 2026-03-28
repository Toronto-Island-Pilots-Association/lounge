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
    <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-2xl min-w-0">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Membership</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure membership tiers, annual fees, and optional trial periods for this lounge.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <MembershipLevelsForm orgId={orgId} />
        </div>
      </div>
    </div>
  )
}
