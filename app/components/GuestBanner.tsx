import Link from 'next/link'

export default function GuestBanner({ orgName }: { orgName?: string }) {
  return (
    <div className="bg-[#0d1e26] text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-4 text-sm">
      <span className="text-gray-300">
        You&apos;re previewing <span className="text-white font-medium">{orgName ?? 'this club'}</span>. Sign in or apply to participate.
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/login"
          className="bg-white text-[#0d1e26] px-3 py-1.5 rounded-md font-medium text-xs hover:bg-gray-100 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/become-a-member"
          className="border border-gray-500 text-gray-200 px-3 py-1.5 rounded-md text-xs hover:border-white hover:text-white transition-colors"
        >
          Apply
        </Link>
      </div>
    </div>
  )
}
