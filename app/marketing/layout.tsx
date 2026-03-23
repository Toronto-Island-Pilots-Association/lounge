import type { Metadata } from 'next'
import { Inter_Tight } from 'next/font/google'
import '../globals.css'

const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ClubLounge — Private lounges for aviation clubs',
  description: 'Member management, events, discussions, and payments — all in one place for your flying club.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
