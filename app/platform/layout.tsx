import type { Metadata } from 'next'
import { Inter_Tight } from 'next/font/google'
import '../globals.css'

const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ClubLounge — Platform',
  description: 'Create and manage your club lounge.',
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
