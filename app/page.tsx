import { redirect } from 'next/navigation'
import { isOrgPublic } from '@/lib/auth'

// Public orgs: send guests straight to /discussions.
// Private orgs: require login first.
export default async function Home() {
  const orgPublic = await isOrgPublic()
  redirect(orgPublic ? '/discussions' : '/login')
}
