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
}

export default function MembershipCard({ user, isPending, isRejected, isPaid, isExpired }: MembershipCardProps) {
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
      borderTop: `1px solid ${topLeftColor}`,
      borderLeft: `1px solid ${topLeftColor}`,
      borderBottom: `1px solid ${bottomRightColor}`,
      borderRight: `1px solid ${bottomRightColor}`,
    }
  }, [tilt.x, tilt.y])

  return (
    <div className="relative">
      <div
        ref={cardRef}
        className="relative bg-gradient-to-br from-[#0d1e26] via-[#0a171c] to-[#0d1e26] rounded-2xl overflow-hidden transition-all duration-300 ease-out shadow-2xl"
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
        <div className="relative h-full p-6 flex flex-col justify-between text-white z-10">
          {/* Top Section */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/70 mb-1">TIPA</div>
              <div className="text-[10px] uppercase tracking-wide text-white/60">Toronto Island Pilots Association</div>
            </div>
            {/* Logo in Chip Area */}
            <div className="relative">
              <div className={`w-12 h-10 bg-gradient-to-br rounded-md border flex items-center justify-center p-1 ${
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
          <div className="my-4">
            <div className="text-[10px] uppercase tracking-widest text-white/60 mb-2">Member</div>
            <div className="text-2xl font-bold tracking-wide" style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>
              {user.profile.full_name?.toUpperCase() || user.profile.email.toUpperCase()}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Membership Level and Member Number - Side by Side */}
              <div className="flex items-start gap-4 mb-2">
                <div>
                  <div className="text-[8px] uppercase tracking-widest text-white/60 mb-0.5">Level</div>
                  {/* Show status instead of level if pending/rejected */}
                  {(isPending || isRejected) ? (
                    <div className={`text-xs font-semibold uppercase tracking-wide ${
                      isRejected ? 'text-red-300' :
                      isPending ? 'text-yellow-300' : 'text-white'
                    }`}>
                      {isRejected ? 'REJECTED' : 'PENDING'}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold uppercase tracking-wide text-white">
                      {getMembershipLevelLabel(user.profile.membership_level)}
                    </div>
                  )}
                </div>
                {user.profile.member_number ? (
                  <div>
                    <div className="text-[8px] uppercase tracking-widest text-white/60 mb-0.5">Number</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-white font-mono">
                      {user.profile.member_number}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[8px] uppercase tracking-widest text-white/60 mb-0.5">Number</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-white font-mono">
                      —
                    </div>
                  </div>
                )}
              </div>
              {/* Member Since - Below Level and Number */}
              {user.profile.created_at && (
                <div className="text-[7px] text-white/50 uppercase tracking-widest mt-1">
                  Member Since {new Date(user.profile.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric' 
                  })}
                </div>
              )}
            </div>

            {/* Expiration Date */}
            {user.profile.membership_expires_at && (
              <div className="text-right">
                <div className="text-[8px] uppercase tracking-widest text-white/60 mb-0.5">Valid Thru</div>
                <div className={`text-xs font-mono ${isExpired ? 'text-red-300' : 'text-white'}`}>
                  {new Date(user.profile.membership_expires_at).toLocaleDateString('en-US', { 
                    month: '2-digit', 
                    year: '2-digit' 
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
