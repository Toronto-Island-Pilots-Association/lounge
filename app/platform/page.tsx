import Link from 'next/link'

export default function PlatformHome() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">ClubLounge Platform</h1>
        <p className="text-gray-600">
          Create and manage your club&apos;s private lounge. Get your own subdomain or bring your own domain.
        </p>
        <Link
          href="/platform/create"
          className="inline-block w-full bg-black text-white rounded-lg px-6 py-3 font-medium hover:bg-gray-800 transition-colors"
        >
          Create your club lounge
        </Link>
      </div>
    </main>
  )
}
