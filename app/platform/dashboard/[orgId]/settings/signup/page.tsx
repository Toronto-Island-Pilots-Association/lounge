import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignupFieldsApiPayload } from '@/lib/settings'
import SignupFieldsForm from './SignupFieldsForm'

export default async function PlatformSignupSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')

  const payload = await getSignupFieldsApiPayload(orgId)

  return (
    <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-2xl min-w-0">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Signup form</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure the fields shown on the membership application form.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <SignupFieldsForm initial={payload.fields} orgId={orgId} />
        </div>
      </div>
    </div>
  )
}
