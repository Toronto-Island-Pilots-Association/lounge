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
  title: 'Club Lounge — Platform',
  description: 'Create and manage your club lounge.',
  icons: {
    icon: {
      url: '/platform-favicon.svg',
      type: 'image/svg+xml',
    },
    shortcut: '/platform-favicon.svg',
  },
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${spaceGrotesk.variable} ${ibmPlex.variable}`}>{children}</div>
}
