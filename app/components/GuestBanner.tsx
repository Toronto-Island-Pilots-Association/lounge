import Link from 'next/link'
import { headers } from 'next/headers'
import {
  getPlatformSignupAbsoluteUrl,
  isClubLoungeDemoOrgSlug,
} from '@/lib/org'
import { getCurrentUserIncludingPending, isOrgPublic } from '@/lib/auth'
import { getOrgIdentity } from '@/lib/settings'

/** True when this request is an org host, org is public, and the user is not signed in. */
export async function shouldShowOrgGuestBanner(): Promise<boolean> {
  const h = await headers()
  if ((h.get('x-domain-type') ?? 'org') !== 'org') return false
  if (!h.get('x-org-id')) return false
  const [user, publicOrg] = await Promise.all([
    getCurrentUserIncludingPending(),
    isOrgPublic(),
  ])
  return publicOrg && !user
}

export default async function GuestBanner() {
  const h = await headers()
  const slug = h.get('x-org-slug')
  const isDemo = isClubLoungeDemoOrgSlug(slug)
  const platformSignupUrl = getPlatformSignupAbsoluteUrl()
  const identity = await getOrgIdentity()
  const displayName = identity.displayName?.trim() || slug || 'this club'

  if (isDemo) {
    return (
      <div className="bg-[var(--color-primary)] text-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
        <span className="text-gray-300">
          You&apos;re previewing the demo. Sign in or apply to participate.
        </span>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={platformSignupUrl}
            className="bg-white text-[var(--color-primary)] px-3 py-1.5 rounded-md font-medium text-xs hover:bg-gray-100 transition-colors text-center"
          >
            Create your lounge
          </a>
          <Link
            href="/login"
            className="border border-gray-500 text-gray-200 px-3 py-1.5 rounded-md text-xs hover:border-white hover:text-white transition-colors text-center"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-primary)] text-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
      <span className="text-gray-300">
        You&apos;re previewing <span className="text-white font-medium">{displayName}</span>. Sign in or apply
        to participate.
      </span>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Link
          href="/login"
          className="bg-white text-[var(--color-primary)] px-3 py-1.5 rounded-md font-medium text-xs hover:bg-gray-100 transition-colors text-center"
        >
          Sign in
        </Link>
        <Link
          href="/become-a-member"
          className="border border-gray-500 text-gray-200 px-3 py-1.5 rounded-md text-xs hover:border-white hover:text-white transition-colors text-center"
        >
          Apply
        </Link>
      </div>
    </div>
  )
}
