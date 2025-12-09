import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#0d1e26] to-[#0a171c] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/airport/pfacfet7v5eahcl6su5nfvcgsm-1.avif"
            alt="Billy Bishop Toronto City Airport"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Why Join Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            WHY JOIN THE TIPA COMMUNITY?
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="relative h-48 mb-6 rounded-lg overflow-hidden">
              <Image
                src="/airport/pfacfet7v5eahcl6su5nfvcgsm-1.avif"
                alt="Billy Bishop Toronto City Airport"
                fill
                className="object-cover"
              />
            </div>
            <div className="mb-4">
              <svg className="h-12 w-12 text-[#0d1e26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Become an Advocate for GA at CYTZ
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Add your voice to a growing group working to preserve space, resources, and fair operating conditions for GA at CYTZ.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="relative h-48 mb-6 rounded-lg overflow-hidden">
              <Image
                src="/airport/toronto_historic_air_terminal_2010.webp"
                alt="Toronto Historic Air Terminal"
                fill
                className="object-cover"
              />
            </div>
            <div className="mb-4">
              <svg className="h-12 w-12 text-[#0d1e26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Connect with Other GA Pilots in Toronto
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Be part of a platform for local pilots to connect, share experiences, and learn from their peers. Participate in local events where pilots can network and build relationships.
            </p>
          </div>
        </div>

        {/* Become a Member Button */}
        <div className="text-center mt-12">
          <Link
            href="/become-a-member"
            className="inline-block px-8 py-3 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors shadow-lg"
          >
            Become a Member
          </Link>
        </div>
      </div>

      {/* How You Can Get Involved Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
              HOW YOU CAN GET INVOLVED
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">📨</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sign up to receive updates from TIPA
              </h3>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Attend future events, town halls, or hangar talks
              </h3>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">✈️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Share your experience flying at CYTZ
              </h3>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">🧭</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Stay informed on advocacy efforts and airport developments
              </h3>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">📣</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Help spread the word to other pilots and aviation supporters
              </h3>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Join TIPA and become a member of our growing community
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Join the Community Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-6">
            JOIN THE TIPA COMMUNITY
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Whether you fly every weekend or simply believe in the value of accessible aviation, be part of the community that supports GA in the city.
          </p>
          <Link
            href="/become-a-member"
            className="inline-block px-8 py-3 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors shadow-lg"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="bg-[#0d1e26] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold mb-4">OUR MISSION</h3>
          <p className="text-xl text-gray-200 max-w-4xl mx-auto">
            TIPA is dedicated to the preservation and promotion of general aviation at Billy Bishop Toronto City Airport (CYTZ).
          </p>
        </div>
      </div>
    </div>
  )
}
