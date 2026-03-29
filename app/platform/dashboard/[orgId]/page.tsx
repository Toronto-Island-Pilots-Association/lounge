import { redirect } from 'next/navigation'

export default async function OrgAdminHome({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  redirect(`/platform/dashboard/${orgId}/settings/general`)
}
