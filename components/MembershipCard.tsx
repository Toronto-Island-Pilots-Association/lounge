'use client'

import { useState, useRef, useMemo } from 'react'
import Image from 'next/image'
import { UserProfile, getMembershipLevelLabel } from '@/types/database'

interface MembershipCardProps {
  user: {
    profile: UserProfile
    user_metadata?: any
  }
  isPending: boolean
  isRejected: boolean
  isPaid: boolean
  isExpired: boolean
  /** When provided (e.g. "Full (trial)"), used for Level instead of raw membership_level */
  membershipLevelDisplay?: string
  /** When provided (e.g. trial end date), used for Valid Thru instead of membership_expires_at */
  validThruDate?: string | null
  /** When true, show "-" instead of member number (trial members don't get a number yet). */
  isOnTrial?: boolean
}

export default function MembershipCard({ user, isPending, isRejected, isPaid, isExpired, membershipLevelDisplay, validThruDate, isOnTrial = false }: MembershipCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -5 // Max 5 degrees
    const rotateY = ((x - centerX) / centerX) * 5 // Max 5 degrees

    setTilt({ x: rotateX, y: rotateY })
    
    // Update glare position for metallic effect
    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100
    setGlarePosition({ x: glareX, y: glareY })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  // Calculate border depth effect based on tilt
  const borderStyle = useMemo(() => {
    // Calculate light direction based on tilt (simulating light from top-left)
    const lightIntensity = (Math.abs(tilt.x) + Math.abs(tilt.y)) * 0.015
    
    // Top and left borders get lighter (highlight), bottom and right get darker (shadow)
    const topLeftColor = `rgba(255, 255, 255, ${0.15 + lightIntensity})`
    const bottomRightColor = `rgba(0, 0, 0, ${0.35 + lightIntensity})`
    
    return {
      borderWidth: '4px',
      borderTop: `4px solid ${topLeftColor}`,
      borderLeft: `2px solid ${topLeftColor}`,
      borderBottom: `4px solid ${bottomRightColor}`,
      borderRight: `4px solid ${bottomRightColor}`,
    }
  }, [tilt.x, tilt.y])

  return (
    <div className="relative w-full">
      <div
        ref={cardRef}
        className="relative bg-gradient-to-br from-[#0d1e26] via-[#0a171c] to-[#0d1e26] rounded-2xl overflow-hidden transition-all duration-300 ease-out sm:min-w-[380px] border-0"
        style={{
          aspectRatio: '1.586 / 1',
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
          ...borderStyle,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Metallic Glare Effect */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 200px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.4) 0%, transparent 50%)`,
            mixBlendMode: 'overlay',
          }}
        />
        
        {/* Card Content */}
        <div className="relative h-full p-[clamp(1rem,4vw,1.5rem)] flex flex-col justify-between text-white z-10 overflow-hidden">
          {/* Top Section */}
          <div className="flex items-start justify-between gap-[clamp(0.5rem,2vw,0.75rem)] min-w-0 flex-shrink-0">
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-[clamp(0.875rem,2vw,0.75rem)] uppercase tracking-widest text-white/70 mb-1">TIPA</div>
              <div className="text-[clamp(0.75rem,1.5vw,0.625rem)] uppercase tracking-wide text-white/60 break-words leading-tight">Toronto Island Pilots Association</div>
            </div>
            {/* Logo in Chip Area */}
            <div className="relative flex-shrink-0">
              <div className={`w-[clamp(2.5rem,8vw,3rem)] h-[clamp(2rem,6.5vw,2.5rem)] bg-gradient-to-br rounded-md border flex items-center justify-center p-1 ${
                isRejected ? 'border-red-400/50' :
                isPending ? 'border-yellow-400/50' :
                isExpired ? 'border-red-400/50' :
                user.profile.status === 'approved' ? 'border-green-400/50' :
                'border-yellow-400/30'
              }`}>
                <div className="relative w-full h-full">
                  <Image
                    src="/logo.png"
                    alt="TIPA Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section - Member Name */}
          <div className="my-[clamp(0.75rem,3vw,1rem)] min-w-0 flex-1 flex flex-col justify-center">
            <div 
              className="font-bold break-words overflow-hidden leading-[1.1]" 
              style={{ 
                fontFamily: 'monospace', 
                fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                letterSpacing: 'clamp(1px, 0.2vw, 2px)',
                wordBreak: 'break-word',
                hyphens: 'auto',
              }}
            >
              <span className="block">
                {user.profile.full_name?.toUpperCase() || user.profile.email.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex items-start justify-between gap-[clamp(0.5rem,2vw,0.75rem)] min-w-0 flex-shrink-0">
            <div className="flex-1 min-w-0">
              {/* Membership Level and Member Number - Side by Side */}
              <div className="flex items-start gap-[clamp(0.5rem,2vw,1rem)] mb-[clamp(0.25rem,1vw,0.5rem)]">
                <div className="min-w-0 flex-1">
                  <div className="text-[clamp(0.625rem,1.2vw,0.5rem)] uppercase tracking-widest text-white/60 mb-0.5">Level</div>
                  {/* Show status instead of level if pending/rejected */}
                  {(isPending || isRejected) ? (
                    <div 
                      className={`font-semibold uppercase tracking-wide break-words ${
                        isRejected ? 'text-red-300' :
                        isPending ? 'text-yellow-300' : 'text-white'
                      }`}
                      style={{ fontSize: 'clamp(0.875rem, 2vw, 0.75rem)' }}
                    >
                      {isRejected ? 'REJECTED' : 'PENDING'}
                    </div>
                  ) : (
                    <div 
                      className="font-semibold uppercase tracking-wide text-white break-words"
                      style={{ fontSize: 'clamp(0.875rem, 2vw, 0.75rem)' }}
                    >
                      {membershipLevelDisplay ?? getMembershipLevelLabel(user.profile.membership_level)}
                    </div>
                  )}
                </div>
                {/* Show Number field if not Associate; on trial show "-" instead of number */}
                {user.profile.membership_level !== 'Associate' && (
                  <div className="min-w-0 flex-1">
                    <div className="text-[clamp(0.625rem,1.2vw,0.5rem)] uppercase tracking-widest text-white/60 mb-0.5">Number</div>
                    <div 
                      className="font-semibold uppercase tracking-wide text-white font-mono break-all"
                      style={{ fontSize: 'clamp(0.875rem, 2vw, 0.75rem)' }}
                    >
                      {isOnTrial ? '-' : (user.profile.member_number || '-')}
                    </div>
                  </div>
                )}
              </div>
              {/* Member Since - Below Level and Number - Hidden for Associate members */}
              {user.profile.created_at && user.profile.membership_level !== 'Associate' && (
                <div 
                  className="text-white/50 uppercase tracking-widest mt-[clamp(0.125rem,0.5vw,0.25rem)] break-words leading-tight"
                  style={{ fontSize: 'clamp(0.625rem, 1vw, 0.4375rem)' }}
                >
                  Member Since {new Date(user.profile.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric' 
                  })}
                </div>
              )}
            </div>

            {/* Expiration Date: Honorary = lifetime; otherwise trial end or membership_expires_at */}
            {(user.profile.membership_level === 'Honorary' || validThruDate || user.profile.membership_expires_at) && (
              <div className="text-right flex-shrink-0">
                <div className="text-[clamp(0.625rem,1.2vw,0.5rem)] uppercase tracking-widest text-white/60 mb-0.5">Valid Thru</div>
                <div 
                  className={`font-mono ${isExpired ? 'text-red-300' : 'text-white'}`}
                  style={{ fontSize: 'clamp(0.875rem, 2vw, 0.75rem)' }}
                >
                  {user.profile.membership_level === 'Honorary'
                    ? 'Lifetime'
                    : new Date(validThruDate || user.profile.membership_expires_at!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Magnetic Stripe Area (Visual Element) */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/40"></div>
      </div>
    </div>
  )
}
