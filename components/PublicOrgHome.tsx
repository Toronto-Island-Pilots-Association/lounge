import Image from 'next/image'
import Link from 'next/link'
import type { PublicHomeTemplate } from '@/lib/settings'

type PublishedPage = {
  id: string
  title: string
  slug: string
  content: string | null
}

type PublicOrgHomeProps = {
  orgId: string
  orgName: string
  displayName: string
  homeTemplate?: PublicHomeTemplate
  description?: string | null
  logoUrl?: string | null
  contactEmail?: string | null
  websiteUrl?: string | null
  feedbackUrl?: string | null
  pages?: PublishedPage[]
}

function GenericPublicHome({
  displayName,
  description,
  contactEmail,
  websiteUrl,
  feedbackUrl,
  pages,
}: Omit<PublicOrgHomeProps, 'orgId' | 'orgName' | 'logoUrl'>) {
  const featuredPages = pages?.slice(0, 3) ?? []

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Welcome
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900 sm:text-6xl">
              {displayName}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {description?.trim() || 'Stay informed, connect with members, and join the community.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/become-a-member"
                className="inline-flex items-center rounded-md bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a171c]"
              >
                Become a member
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 hover:border-gray-400"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">About</h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              {description?.trim() || `${displayName} is using ClubLounge as its member home.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
                  Visit website
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="text-[var(--color-primary)] underline">
                  Contact
                </a>
              )}
              {feedbackUrl && (
                <a href={feedbackUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
                  Feedback
                </a>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
            <h2 className="text-xl font-semibold text-gray-900">Public Pages</h2>
            {featuredPages.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No published pages yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {featuredPages.map((page) => (
                  <Link
                    key={page.id}
                    href={`/pages/${page.slug}`}
                    className="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-gray-300"
                  >
                    <div className="font-medium text-gray-900">{page.title}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function TipaPublicHome({
  displayName,
  logoUrl,
}: Pick<PublicOrgHomeProps, 'displayName' | 'logoUrl'>) {
  return (
    <main className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1e26] to-[#0a171c] text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/airport/pfacfet7v5eahcl6su5nfvcgsm-1.avif"
            alt="Billy Bishop Toronto City Airport"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-white/10">
              <Image
                src={logoUrl || '/logo.png'}
                alt={`${displayName} logo`}
                fill
                className="object-contain p-2"
                sizes="48px"
              />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">{displayName}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Toronto Island Pilots Association</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/5"
          >
            Member Sign In
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mb-10 text-center sm:mb-12 lg:mb-16">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            Why Join the TIPA Community?
          </h1>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="relative h-64 w-full overflow-hidden rounded-lg shadow-lg sm:h-80 lg:h-96">
            <Image
              src="/airport/pfacfet7v5eahcl6su5nfvcgsm-1.avif"
              alt="Billy Bishop Toronto City Airport"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 48vw"
            />
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Become an Advocate for GA at CYTZ
              </h2>
              <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
                Add your voice to a growing group working to preserve space, resources, and fair operating conditions for GA at CYTZ.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Connect with Other GA Pilots in Toronto
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
                Be part of a platform for local pilots to connect, share experiences, and learn from their peers. Participate in local events where pilots can network and build relationships.
              </p>
            </div>

            <div>
              <Link
                href="/become-a-member"
                className="inline-block rounded-lg bg-[#0d1e26] px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#0a171c] hover:shadow-xl sm:px-8 sm:py-3.5 sm:text-lg"
              >
                Become a Member
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8">
          <div className="mb-10 text-center sm:mb-12 lg:mb-16">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
              How You Can Get Involved
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '📨', text: 'Sign up to receive updates from TIPA' },
              { icon: '📅', text: 'Attend future events, town halls, or hangar talks' },
              { icon: '✈️', text: 'Share your experience flying at CYTZ' },
              { icon: '🧭', text: 'Stay informed on advocacy efforts and airport developments' },
              { icon: '📣', text: 'Help spread the word to other pilots and aviation supporters' },
              { icon: '🤝', text: 'Join TIPA and become a member of our growing community' },
            ].map((item) => (
              <div
                key={item.text}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg sm:p-6"
              >
                <div className="mb-3 text-3xl sm:mb-4 sm:text-4xl">{item.icon}</div>
                <h3 className="text-base font-semibold text-gray-900 sm:text-lg">{item.text}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="relative h-64 w-full overflow-hidden rounded-lg shadow-lg sm:h-96 lg:h-[500px]">
          <Image
            src="/airport/toronto_historic_air_terminal_2010.webp"
            alt="Toronto Historic Air Terminal"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            Join the TIPA Community
          </h2>
          <p className="mx-auto mt-4 max-w-3xl px-4 text-lg text-gray-600 sm:mt-6 sm:text-xl">
            Whether you fly every weekend or simply believe in the value of accessible aviation, be part of the community that supports GA in the city.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8">
            <Link
              href="/become-a-member"
              className="inline-block rounded-lg bg-[#0d1e26] px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#0a171c] hover:shadow-xl sm:px-8 sm:py-3.5 sm:text-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#0d1e26] py-10 text-white sm:py-12">
        <div className="mx-auto max-w-7xl px-6 text-center sm:px-6 lg:px-8">
          <h3 className="text-xl font-bold sm:text-2xl">Our Mission</h3>
          <p className="mx-auto mt-3 max-w-4xl px-4 text-lg text-gray-200 sm:mt-4 sm:text-xl">
            TIPA is dedicated to the preservation and promotion of general aviation at Billy Bishop Toronto City Airport (CYTZ).
          </p>
        </div>
      </section>
    </main>
  )
}

export default function PublicOrgHome(props: PublicOrgHomeProps) {
  if (props.homeTemplate === 'tipa_legacy') {
    return (
      <TipaPublicHome
        displayName={props.displayName || props.orgName}
        logoUrl={props.logoUrl}
      />
    )
  }

  return (
    <GenericPublicHome
      displayName={props.displayName || props.orgName}
      description={props.description}
      contactEmail={props.contactEmail}
      websiteUrl={props.websiteUrl}
      feedbackUrl={props.feedbackUrl}
      pages={props.pages}
    />
  )
}
