'use client'

import Navbar from '@/components/Navbar'

/**
 * Renders the main site Navbar (logo, nav links, user menu).
 * Shown on all routes including admin so the header is always visible.
 */
export default function NavbarWrapper() {
  return <Navbar />
}
