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
      <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Why Join the TIPA Community?
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          {/* Image Section */}
          <div className="relative w-full h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden shadow-lg">
            <Image
              src="/airport/pfacfet7v5eahcl6su5nfvcgsm-1.avif"
              alt="Billy Bishop Toronto City Airport"
              fill
              className="object-cover"
            />
          </div>

          {/* Content Section */}
          <div className="space-y-6 sm:space-y-8">
            <div>
              <div className="mb-3 sm:mb-4">
                <svg className="h-10 w-10 sm:h-12 sm:w-12 text-[#0d1e26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Become an Advocate for GA at CYTZ
              </h3>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                Add your voice to a growing group working to preserve space, resources, and fair operating conditions for GA at CYTZ.
              </p>
            </div>

            <div>
              <div className="mb-3 sm:mb-4">
                <svg className="h-10 w-10 sm:h-12 sm:w-12 text-[#0d1e26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Connect with Other GA Pilots in Toronto
              </h3>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                Be part of a platform for local pilots to connect, share experiences, and learn from their peers. Participate in local events where pilots can network and build relationships.
              </p>
            </div>
          </div>
        </div>

        {/* Become a Member Button */}
        <div className="text-center mt-10 sm:mt-12">
          <Link
            href="/become-a-member"
            className="inline-block px-6 sm:px-8 py-3 sm:py-3.5 bg-[#0d1e26] text-white text-base sm:text-lg font-semibold rounded-lg hover:bg-[#0a171c] transition-colors shadow-lg hover:shadow-xl"
          >
            Become a Member
          </Link>
        </div>
      </div>

      {/* How You Can Get Involved Section */}
      <div className="bg-gray-50 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              How You Can Get Involved
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📨</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Sign up to receive updates from TIPA
              </h3>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📅</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Attend future events, town halls, or hangar talks
              </h3>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">✈️</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Share your experience flying at CYTZ
              </h3>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🧭</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Stay informed on advocacy efforts and airport developments
              </h3>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📣</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Help spread the word to other pilots and aviation supporters
              </h3>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🤝</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Join TIPA and become a member of our growing community
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Image Section After How You Can Get Involved */}
      <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="relative w-full h-64 sm:h-96 lg:h-[500px] rounded-lg overflow-hidden shadow-lg">
          <Image
            src="/airport/toronto_historic_air_terminal_2010.webp"
            alt="Toronto Historic Air Terminal"
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Join the Community Section */}
      <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
            Join the TIPA Community
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
            Whether you fly every weekend or simply believe in the value of accessible aviation, be part of the community that supports GA in the city.
          </p>
          <Link
            href="/become-a-member"
            className="inline-block px-6 sm:px-8 py-3 sm:py-3.5 bg-[#0d1e26] text-white text-base sm:text-lg font-semibold rounded-lg hover:bg-[#0a171c] transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="bg-[#0d1e26] text-white py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Our Mission</h3>
          <p className="text-lg sm:text-xl text-gray-200 max-w-4xl mx-auto px-4">
            TIPA is dedicated to the preservation and promotion of general aviation at Billy Bishop Toronto City Airport (CYTZ).
          </p>
        </div>
      </div>
    </div>
  )
}
