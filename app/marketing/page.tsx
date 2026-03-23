import Link from 'next/link'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'

export default function MarketingHome() {
  const platformUrl = `https://platform.${ROOT_DOMAIN}`

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b">
        <span className="font-bold text-lg tracking-tight">ClubLounge</span>
        <a
          href={platformUrl}
          className="text-sm font-medium bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-800 transition-colors"
        >
          Create your lounge
        </a>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-8 py-24 space-y-8">
        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          The private lounge for your flying club
        </h1>
        <p className="text-xl text-gray-500 max-w-xl">
          Member management, events, discussions, and payments — all under your own domain.
          Up and running in minutes.
        </p>
        <div className="flex gap-4">
          <a
            href={platformUrl}
            className="bg-black text-white rounded-lg px-6 py-3 font-medium hover:bg-gray-800 transition-colors"
          >
            Get started free
          </a>
          <a
            href={`${platformUrl}/create`}
            className="border rounded-lg px-6 py-3 font-medium hover:bg-gray-50 transition-colors"
          >
            Create your lounge
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-t px-8 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Member management', body: 'Applications, approvals, membership levels, and renewals — fully automated.' },
            { title: 'Events & RSVPs', body: 'Post events, track attendance, and sync to members\' Google Calendar.' },
            { title: 'Hangar Talk', body: 'Private discussion board with categories, @mentions, and notifications.' },
          ].map(f => (
            <div key={f.title} className="space-y-2">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-8 py-6 text-sm text-gray-400 flex justify-between">
        <span>© {new Date().getFullYear()} ClubLounge</span>
        <a href={`mailto:hello@${ROOT_DOMAIN}`} className="hover:text-gray-600">hello@{ROOT_DOMAIN}</a>
      </footer>
    </main>
  )
}
