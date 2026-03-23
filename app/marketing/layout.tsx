import type { Metadata } from 'next'
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import '@/app/styles/club-lounge-landing.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cl-display',
})

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cl-body',
})

export const metadata: Metadata = {
  title: 'Club Lounge — The private lounge for every club',
  description:
    'Give your members a private home — directory, discussions, events, and dues in one place. Your club, your URL.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${spaceGrotesk.variable} ${ibmPlex.variable}`}>{children}</div>
}
