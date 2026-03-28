import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ClubLounge — The private lounge for every club'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: '#0d1e26',
          padding: '80px',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#416e82',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: 'white',
              fontWeight: 700,
            }}
          >
            C
          </div>
          <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px' }}>
            ClubLounge
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '64px',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-2px',
            marginBottom: '28px',
            maxWidth: '800px',
          }}
        >
          The private lounge for every club.
        </div>

        {/* Subheading */}
        <div
          style={{
            color: '#8ba8b5',
            fontSize: '28px',
            fontWeight: 400,
            lineHeight: 1.4,
            maxWidth: '700px',
          }}
        >
          Directory, discussions, events, and dues — all on your own URL.
        </div>

        {/* Bottom CTA pill */}
        <div
          style={{
            marginTop: '56px',
            background: '#416e82',
            borderRadius: '999px',
            padding: '14px 32px',
            color: '#ffffff',
            fontSize: '22px',
            fontWeight: 600,
          }}
        >
          Start free → clublounge.app
        </div>
      </div>
    ),
    { ...size }
  )
}
