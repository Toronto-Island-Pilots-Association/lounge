import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import '@/app/styles/club-lounge-landing.css'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['600', '700'],
})

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'
const BASE_URL = `https://${ROOT_DOMAIN}`

const TITLE = 'Club Lounge — Private Community Software for Clubs & Associations'
const DESCRIPTION =
  'Give your members a private home — directory, discussions, events, and Stripe-powered dues. Your own URL, from $5/month. Used by flying clubs, yacht clubs, cycling clubs, and more.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'Club Lounge',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/marketing/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Club Lounge — Private community software for clubs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/marketing/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={spaceGrotesk.variable}>{children}</div>
}
