import { redirect } from 'next/navigation'

/** @deprecated Use `/platform/dashboard/[orgId]/settings/integrations`. */
export default async function PlatformIntegrationsPageRedirect({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  redirect(`/platform/dashboard/${orgId}/settings/integrations`)
}
