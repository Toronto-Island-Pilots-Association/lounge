'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MemberProfile, getMembershipLevelLabel } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { getPlatformSignupAbsoluteUrl, isClubLoungeDemoOrgSlug } from '@/lib/org'

/** Navbar persona for unauthenticated visitors on the public demo org (demo.* / Lakeside). */
const DEMO_GUEST_PREVIEW = {
  name: 'Jamie Rivera',
  initials: 'JR',
} as const

type OrgConfig = {
  org: {
    name: string
    slug?: string
    displayName: string
    logoUrl: string | null
    siteIconUrl?: string | null
  }
  features: {
    discussions: boolean; events: boolean; resources: boolean
    memberDirectory: boolean; allowMemberInvitations: boolean
    discussionsLabel: string; eventsLabel: string; resourcesLabel: string
  }
}

export default function Navbar({ guestPreviewBar = false }: { guestPreviewBar?: boolean }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  /** Public org, not logged in — can browse discussions, events, announcements, etc. */
  const [isGuest, setIsGuest] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [guestDemoMenuOpen, setGuestDemoMenuOpen] = useState(false)
  const [isDevEnvironment, setIsDevEnvironment] = useState(false)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [notificationCount, setNotificationCount] = useState<number>(0)
  const [orgConfig, setOrgConfig] = useState<OrgConfig | null>(null)
  const router = useRouter()

  // Check if we're in a dev environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const isDev = 
        hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.includes('lounge-dev.tipa.ca') ||
        hostname.includes('dev') ||
        hostname.includes('staging')
      // Use setTimeout to avoid setState in effect warning
      setTimeout(() => setIsDevEnvironment(isDev), 0)
    }
  }, [])

  useEffect(() => {
    const loadUserData = async (shouldFetchPendingCount = false) => {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          if (data.isGuest) {
            setIsGuest(true)
            setProfile(null)
            setUser(null)
            setPendingCount(0)
            setNotificationCount(0)
            return
          }
          setIsGuest(false)
          setProfile(data.profile)
          setUser({ id: data.profile.id, email: data.profile.email })

          if (shouldFetchPendingCount && data.profile?.role === 'admin') {
            fetchPendingCount()
          } else if (data.profile?.role !== 'admin') {
            setPendingCount(0)
          }
          if (data.profile?.status === 'approved' || data.profile?.role === 'admin') {
            fetchNotificationCount()
          } else {
            setNotificationCount(0)
          }
        } else {
          setIsGuest(false)
          setProfile(null)
          setUser(null)
          setPendingCount(0)
          setNotificationCount(0)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        setIsGuest(false)
        setProfile(null)
        setUser(null)
        setPendingCount(0)
      }
    }

    // Initial load
    loadUserData(true)

    // Load org config (features, branding) — public, no auth needed
    fetch('/api/org/config')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setOrgConfig(d))
      .catch(() => {})

    // React to auth changes (sign in / sign out) without polling
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') loadUserData(true)
      if (event === 'SIGNED_OUT') loadUserData(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/admin/pending-count')
      if (response.ok) {
        const data = await response.json()
        setPendingCount(data.count || 0)
      } else {
        setPendingCount(0)
      }
    } catch (error) {
      console.error('Error fetching pending count:', error)
      setPendingCount(0)
    }
  }

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications?limit=0')
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.unreadCount ?? 0)
      } else {
        setNotificationCount(0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
      setNotificationCount(0)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-user-menu]')) {
        setUserMenuOpen(false)
      }
      if (!target.closest('[data-guest-demo-menu]')) {
        setGuestDemoMenuOpen(false)
      }
    }

    if (userMenuOpen || guestDemoMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen, guestDemoMenuOpen])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setMobileMenuOpen(false)
      setUserMenuOpen(false)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
      // Still redirect even if logout fails
      router.push('/')
      router.refresh()
    }
  }

  const handleLinkClick = () => {
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
    setGuestDemoMenuOpen(false)
  }

  const showMemberBrowse =
    isGuest || (!!profile && (profile.status === 'approved' || profile.role === 'admin'))

  const isDemoLoungeGuest =
    isGuest && isClubLoungeDemoOrgSlug(orgConfig?.org.slug ?? undefined)

  const devBannerMobileTop = guestPreviewBar ? 'top-[52px]' : 'top-0'
  const navMobileTop =
    guestPreviewBar && isDevEnvironment
      ? 'top-[80px]'
      : guestPreviewBar
        ? 'top-[52px]'
        : isDevEnvironment
          ? 'top-[28px]'
          : 'top-0'

  const navBrandLabel = orgConfig
    ? orgConfig.org.displayName?.trim() || orgConfig.org.name?.trim() || 'Club'
    : ''
  const navHeaderLogo = orgConfig?.org.logoUrl?.trim() || ''

  return (
    <>
      {/* Dev Environment Banner */}
      {isDevEnvironment && (
        <div
          className={`bg-yellow-400 text-yellow-900 text-center py-1.5 px-4 text-xs font-semibold fixed left-0 right-0 z-[60] md:relative md:top-0 md:z-auto ${devBannerMobileTop} md:top-0`}
        >
          🚧 DEVELOPMENT ENVIRONMENT 🚧
        </div>
      )}
      <nav
        className={`bg-white border-b border-gray-200 fixed left-0 right-0 z-50 md:relative md:top-0 md:z-auto ${navMobileTop} md:top-0`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link 
              href="/discussions"
              onClick={handleLinkClick}
              className="flex items-center hover:opacity-80 transition-opacity min-w-0 max-w-[min(100%,14rem)] sm:max-w-[min(100%,18rem)]"
            >
              {navHeaderLogo ? (
                <Image
                  src={navHeaderLogo}
                  alt={`${navBrandLabel} — home`}
                  width={200}
                  height={56}
                  className="h-10 sm:h-14 w-auto max-w-full object-contain object-left"
                  priority
                />
              ) : orgConfig ? (
                <span className="text-lg font-bold tracking-tight text-[#0d1e26] truncate">
                  {navBrandLabel}
                </span>
              ) : null}
            </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {showMemberBrowse && (
              <>
                {(orgConfig?.features.discussions ?? true) && (
                  <Link
                    href="/discussions"
                    className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {orgConfig?.features.discussionsLabel ?? 'Discussions'}
                  </Link>
                )}
                {(orgConfig?.features.events ?? true) && (
                  <Link
                    href="/events"
                    className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {orgConfig?.features.eventsLabel ?? 'Events'}
                  </Link>
                )}
                {(orgConfig?.features.resources ?? true) && (
                  <Link
                    href="/resources"
                    className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {orgConfig?.features.resourcesLabel ?? 'Announcements'}
                  </Link>
                )}
                {(orgConfig?.features.memberDirectory ?? true) && (
                  <Link
                    href="/members"
                    className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Members
                  </Link>
                )}
                {isGuest && (
                  <Link
                    href="/membership"
                    className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Membership
                  </Link>
                )}
              </>
            )}
            {user ? (
              <>
                <Link
                  href="/membership"
                  className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Membership
                </Link>
                {profile && (profile.status === 'approved' || profile.role === 'admin') && (
                  <div className="ml-1 pl-1 -mr-[14px] border-l border-gray-200 self-stretch flex items-center">
                    <Link
                      href="/notifications"
                      className="flex items-center justify-center px-1.5 py-2 text-gray-700 hover:text-gray-900 rounded-md text-sm font-medium transition-colors"
                      aria-label="Notifications"
                    >
                      <span className="relative inline-flex">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {notificationCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 bg-[#0d1e26] text-white text-[9px] font-bold rounded-full leading-none">
                            {notificationCount > 99 ? '99+' : notificationCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  </div>
                )}
                <div className="relative ml-0.5 pl-3 border-l border-gray-200 self-stretch flex items-center" data-user-menu>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:ring-offset-2 rounded-md p-1"
                    aria-label="User menu"
                    aria-expanded={userMenuOpen}
                  >
                    {profile?.profile_picture_url ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300">
                        <Image
                          src={profile.profile_picture_url}
                          alt={profile?.full_name || user.email || 'Profile'}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    )}
                    <span className="text-sm text-gray-600 hidden lg:inline">
                      {profile?.full_name || user.email}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        userMenuOpen ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </Link>
                      {profile && (profile.status === 'approved' || profile.role === 'admin') && (orgConfig?.features.allowMemberInvitations ?? true) && (
                        <Link
                          href="/invite"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          Help Grow {orgConfig?.org.displayName || orgConfig?.org.name || 'Us'}
                        </Link>
                      )}
                      <a
                        href="https://forms.gle/NfuYpL2JLhcE56Bp7"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Feedback
                      </a>
                      {profile?.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 relative"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Admin</span>
                          {pendingCount > 0 && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-yellow-500 text-gray-900 text-[10px] font-bold rounded-full leading-none border border-yellow-600">
                              {pendingCount > 99 ? '99+' : pendingCount}
                            </span>
                          )}
                        </Link>
                      )}
                      {profile?.role === 'admin' && (
                        <a
                          href={`${process.env.NODE_ENV === 'development' ? 'http' : 'https'}://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'}${process.env.NODE_ENV === 'development' ? ':3000' : ''}/platform/dashboard`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Platform
                        </a>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : isDemoLoungeGuest ? (
              <div className="relative flex items-center" data-guest-demo-menu>
                <button
                  type="button"
                  onClick={() => setGuestDemoMenuOpen(!guestDemoMenuOpen)}
                  className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:ring-offset-2 rounded-md p-1"
                  aria-label="Demo preview menu"
                  aria-expanded={guestDemoMenuOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center border border-gray-300 text-xs font-semibold text-white shrink-0">
                    {DEMO_GUEST_PREVIEW.initials}
                  </div>
                  <span className="text-sm text-gray-700 hidden lg:inline max-w-[140px] truncate">
                    {DEMO_GUEST_PREVIEW.name}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                      guestDemoMenuOpen ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {guestDemoMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 leading-snug">
                      Sample member — you&apos;re browsing the demo as a guest.
                    </p>
                    <Link
                      href="/login"
                      onClick={() => setGuestDemoMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign in
                    </Link>
                    <a
                      href={getPlatformSignupAbsoluteUrl()}
                      rel="noopener noreferrer"
                      onClick={() => setGuestDemoMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create your lounge
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/become-a-member"
                  className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Become a Member
                </Link>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu: logged-in members and public-org guests (browse + account actions) */}
          {user || isGuest ? (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0d1e26]"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          ) : (
            <div className="md:hidden flex items-center gap-2">
              <Link
                href="/become-a-member"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Join
              </Link>
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Login
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (user || isGuest) && (
          <div className="md:hidden border-t border-gray-200 py-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="space-y-1">
              {showMemberBrowse && (
                <>
                  {(orgConfig?.features.discussions ?? true) && (
                    <Link
                      href="/discussions"
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {orgConfig?.features.discussionsLabel ?? 'Discussions'}
                    </Link>
                  )}
                  {(orgConfig?.features.events ?? true) && (
                    <Link
                      href="/events"
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {orgConfig?.features.eventsLabel ?? 'Events'}
                    </Link>
                  )}
                  {(orgConfig?.features.resources ?? true) && (
                    <Link
                      href="/resources"
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {orgConfig?.features.resourcesLabel ?? 'Announcements'}
                    </Link>
                  )}
                  {(orgConfig?.features.memberDirectory ?? true) && (
                    <Link
                      href="/members"
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Members
                    </Link>
                  )}
                  {isGuest && (
                    <Link
                      href="/membership"
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Membership
                    </Link>
                  )}
                </>
              )}
              {user && (
                <>
                  {profile && (profile.status === 'approved' || profile.role === 'admin') && (
                    <Link
                      href="/notifications"
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Notifications
                      {notificationCount > 0 && (
                        <span className="ml-auto flex items-center justify-center min-w-[20px] h-[20px] px-1.5 bg-[#0d1e26] text-white text-xs font-bold rounded-full">
                          {notificationCount > 99 ? '99+' : notificationCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link
                    href="/membership"
                    onClick={handleLinkClick}
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Membership
                  </Link>
                  <Link
                    href="/settings"
                    onClick={handleLinkClick}
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  {profile && (profile.status === 'approved' || profile.role === 'admin') && (orgConfig?.features.allowMemberInvitations ?? true) && (
                    <Link
                      href="/invite"
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Help Grow {orgConfig?.org.displayName || orgConfig?.org.name || 'Us'}
                    </Link>
                  )}
                  <a
                    href="https://forms.gle/NfuYpL2JLhcE56Bp7"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Feedback
                  </a>
                  {profile?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors relative"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Admin</span>
                      {pendingCount > 0 && (
                        <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-yellow-500 text-gray-900 text-[10px] font-bold rounded-full leading-none border border-yellow-600">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {profile?.role === 'admin' && (
                    <a
                      href={`${process.env.NODE_ENV === 'development' ? 'http' : 'https'}://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'}${process.env.NODE_ENV === 'development' ? ':3000' : ''}/platform/dashboard`}
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Platform
                    </a>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </>
              )}
              {isGuest && (
                <div className="pt-2 mt-2 border-t border-gray-200 space-y-1">
                  {isDemoLoungeGuest ? (
                    <>
                      <div className="flex items-center gap-3 px-3 py-3 mx-1 mb-2 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                          {DEMO_GUEST_PREVIEW.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{DEMO_GUEST_PREVIEW.name}</p>
                          <p className="text-xs text-gray-500">Demo preview · not signed in</p>
                        </div>
                      </div>
                      <Link
                        href="/login"
                        onClick={handleLinkClick}
                        className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign in
                      </Link>
                      <a
                        href={getPlatformSignupAbsoluteUrl()}
                        rel="noopener noreferrer"
                        onClick={handleLinkClick}
                        className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create your lounge
                      </a>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/become-a-member"
                        onClick={handleLinkClick}
                        className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        Become a Member
                      </Link>
                      <Link
                        href="/login"
                        onClick={handleLinkClick}
                        className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        Login
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  )
}

