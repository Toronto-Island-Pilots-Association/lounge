import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import MembershipCard from '@/components/MembershipCard'
import type { MemberProfile } from '@/types/database'

const MARQUEE_ITEMS = [
  'Flying clubs',
  'Yacht clubs',
  'Cycling clubs',
  'Golf clubs',
  'Rowing clubs',
  'Sailing associations',
  'Photography societies',
  'Professional chapters',
  'Sports clubs',
  'Alumni associations',
] as const

const FAQS = [
  {
    q: 'How much does Club Lounge cost?',
    a: 'Plans start at $5/month for clubs of up to 20 members. Core is $49/month and is best for clubs with up to 200 members and up to 2 admins. Growth is $99/month and is best for clubs with up to 500 members and up to 5 admins. Pro is $199/month for larger clubs that need higher-touch support.',
  },
  {
    q: 'Can I migrate from Wild Apricot?',
    a: 'Yes. We offer free member data migration from Wild Apricot, typically completed within 48 hours of signing up.',
  },
  {
    q: "Do members get a URL that's actually ours?",
    a: 'Every club gets its own subdomain (yourclub.clublounge.app). Growth plan and above support a fully custom domain like lounge.yourclub.com — your DNS, your brand.',
  },
  {
    q: 'How does dues collection work?',
    a: 'Club Lounge uses Stripe Connect. Set your annual or monthly dues amount and members pay directly. Automatic renewals, instant payment records, and a real-time view of who has paid — all from your admin dashboard. Stripe processing fees apply, plus a 2% ClubLounge platform fee on dues payments.',
  },
  {
    q: 'Do you support clubs in the US and Canada?',
    a: 'Yes. Club Lounge supports clubs in both the US and Canada. Payments go directly to your club through Stripe, and we can onboard clubs in either market.',
  },
  {
    q: 'What types of clubs use Club Lounge?',
    a: 'Flying clubs, yacht clubs, cycling clubs, golf clubs, rowing clubs, photography societies, professional association chapters, and alumni associations. Any club that needs a private community home.',
  },
] as const

const VERTICALS = [
  {
    icon: '✈️',
    title: 'Flying clubs & airports',
    body: 'A community layer alongside your scheduling software. Where pilots actually talk to each other.',
  },
  { icon: '⛵', title: 'Yacht & sailing clubs', body: 'Complex membership tiers, social calendars, fleet communications — all in one private space.' },
  { icon: '⛳', title: 'Golf clubs', body: "The community layer your booking app doesn't have. Member retention starts with members knowing each other." },
  { icon: '🚴', title: 'Cycling & triathlon clubs', body: 'Replace the Facebook group and the spreadsheet. Ride sign-ups, kit votes, and route sharing — all in one place.' },
  { icon: '🚣', title: 'Rowing & paddling clubs', body: 'Junior, masters, and university programs all in one lounge. Parents, coaches, and members on the same page.' },
  { icon: '🏛️', title: 'Professional chapters', body: "Engineering, legal, medical, real estate association chapters. The private hub your national body doesn't provide." },
] as const

const LANDING_MEMBER_PROFILE: MemberProfile = {
  id: '00000000-0000-4000-8000-000000000101',
  user_id: '00000000-0000-4000-8000-000000000102',
  org_id: '00000000-0000-4000-8000-000000000103',
  role: 'member',
  status: 'approved',
  membership_level: 'Full',
  membership_class: null,
  member_number: '001042',
  membership_expires_at: '2026-09-01T00:00:00.000Z',
  invited_at: null,
  last_reminder_sent_at: null,
  reminder_count: 0,
  stripe_subscription_id: 'sub_clublounge_demo',
  stripe_customer_id: null,
  paypal_subscription_id: null,
  subscription_cancel_at_period_end: false,
  statement_of_interest: null,
  interests: null,
  how_did_you_hear: null,
  is_copa_member: null,
  join_copa_flight_32: null,
  copa_membership_number: null,
  pilot_license_type: null,
  aircraft_type: null,
  call_sign: null,
  how_often_fly_from_ytz: null,
  is_student_pilot: false,
  flight_school: null,
  instructor_name: null,
  custom_data: null,
  created_at: '2019-01-15T00:00:00.000Z',
  updated_at: '2019-01-15T00:00:00.000Z',
  email: 'sarah.mitchell@example.com',
  full_name: 'Sarah Mitchell',
  first_name: 'Sarah',
  last_name: 'Mitchell',
  phone: null,
  street: null,
  city: 'Toronto',
  province_state: 'ON',
  postal_zip_code: null,
  country: 'Canada',
  profile_picture_url: null,
  notify_replies: true,
}

export type ClubLoungeLandingProps = {
  rootDomain: string
  signupHref: string
  loginHref: string
  demoHref: string
  internalLinks: boolean
}

function NavLink({ href, className, children, internalLinks }: {
  href: string; className?: string; children: ReactNode; internalLinks: boolean
}) {
  if (internalLinks) return <Link href={href} className={className}>{children}</Link>
  return <a href={href} className={className}>{children}</a>
}

function AppWindow({
  url,
  children,
  showChrome = true,
}: {
  url: string
  children: ReactNode
  showChrome?: boolean
}) {
  return (
    <div className="cl-app-window">
      {showChrome ? (
        <div className="cl-app-topbar">
          <div className="cl-mock-dots">
            <div className="cl-mock-dot cl-r" /><div className="cl-mock-dot cl-y" /><div className="cl-mock-dot cl-g" />
          </div>
          <div className="cl-mock-url">{url}</div>
        </div>
      ) : null}
      <div className="cl-app-body">{children}</div>
    </div>
  )
}

function MembershipVisual() {
  return (
    <div className="cl-membership-visual">
      <div className="cl-membership-card-wrap">
        <MembershipCard
          user={{ profile: LANDING_MEMBER_PROFILE, user_metadata: {} }}
          isPending={false}
          isRejected={false}
          isPaid
          isExpired={false}
          clubBrand={{
            shortName: 'TIPA',
            tagline: 'Toronto Island Pilots Assoc.',
            logoUrl: null,
          }}
          preferTipaMarkWhenNoLogo
        />
      </div>
      {/* Directory rows */}
      <div className="cl-mini-dir">
        {[
          { init: 'SM', name: 'Sarah Mitchell', level: 'Full Member', color: '#6366f1', status: 'Active' },
          { init: 'MK', name: 'Mike Kowalski',  level: 'Student',     color: '#f59e0b', status: 'Active' },
          { init: 'TR', name: 'Tom Reynolds',   level: 'Associate',   color: '#10b981', status: 'Pending' },
        ].map(m => (
          <div key={m.name} className="cl-mini-dir-row">
            <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden>
              <circle cx="14" cy="14" r="14" fill={m.color} />
              <text x="14" y="18" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">{m.init}</text>
            </svg>
            <div className="cl-mini-dir-info">
              <span className="cl-mini-dir-name">{m.name}</span>
              <span className="cl-mini-dir-level">{m.level}</span>
            </div>
            <span className={`cl-mini-dir-badge ${m.status === 'Pending' ? 'cl-badge-pending' : 'cl-badge-active'}`}>
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DuesVisual({ rootDomain }: { rootDomain: string }) {
  return (
    <AppWindow url={`admin.${rootDomain}`} showChrome={false}>
      {/* Revenue summary */}
      <div className="cl-dues-summary">
        <div className="cl-dues-stat">
          <div className="cl-dues-stat-num">$1,840</div>
          <div className="cl-dues-stat-label">Collected this year</div>
        </div>
        <div className="cl-dues-stat">
          <div className="cl-dues-stat-num">38 / 41</div>
          <div className="cl-dues-stat-label">Members paid</div>
        </div>
      </div>
      {/* Member dues list */}
      <div className="cl-dues-list">
        {[
          { init: 'SM', name: 'Sarah M.', amount: '$45', color: '#6366f1', paid: true,  note: 'Auto-renews Nov' },
          { init: 'MK', name: 'Mike K.',  amount: '$25', color: '#f59e0b', paid: true,  note: 'Paid Sep 3' },
          { init: 'TR', name: 'Tom R.',   amount: '$45', color: '#10b981', paid: false, note: 'Due Nov 12' },
          { init: 'LP', name: 'Lisa P.',  amount: '$25', color: '#ec4899', paid: true,  note: 'Auto-renews Dec' },
        ].map(m => (
          <div key={m.name} className="cl-dues-row">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
              <circle cx="12" cy="12" r="12" fill={m.color} />
              <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">{m.init}</text>
            </svg>
            <div className="cl-dues-row-info">
              <span className="cl-dues-row-name">{m.name}</span>
              <span className="cl-dues-row-note">{m.note}</span>
            </div>
            <span className="cl-dues-row-amount">{m.amount}</span>
            <span className={`cl-mini-dir-badge ${m.paid ? 'cl-badge-active' : 'cl-badge-pending'}`}>
              {m.paid ? 'Paid' : 'Due'}
            </span>
          </div>
        ))}
      </div>
    </AppWindow>
  )
}

function DiscussionsVisual({ rootDomain }: { rootDomain: string }) {
  return (
    <AppWindow url={`ottawacycling.${rootDomain}`} showChrome={false}>
      <div className="cl-disc-header">
        <span className="cl-disc-title">Discussions</span>
        <button className="cl-disc-new" type="button">+ New post</button>
      </div>
      <div className="cl-disc-list">
        {[
          { init: 'SL', color: '#6366f1', name: 'Sarah L.', time: '2h ago', replies: 8,
            body: 'Anyone doing the Gatineau hills ride Saturday morning? Leaving at 7am ☀️', pinned: false },
          { init: 'MK', color: '#f59e0b', name: 'Mike K.', time: '4h ago', replies: 14,
            body: 'New kit designs are up in Resources — vote closes Friday! Three options 🚴', pinned: false },
          { init: '📌', color: '#0d1e26', name: 'Club Admin', time: 'Sep 28', replies: 2,
            body: 'September newsletter is out. Read it in Resources → Newsletters.', pinned: true },
        ].map((post, i) => (
          <div key={i} className="cl-disc-post">
            <div className="cl-disc-post-head">
              {post.pinned ? (
                <span className="cl-disc-av cl-disc-av-pin">📌</span>
              ) : (
                <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden className="cl-disc-av">
                  <circle cx="14" cy="14" r="14" fill={post.color} />
                  <text x="14" y="18" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">{post.init}</text>
                </svg>
              )}
              <span className="cl-disc-post-name">{post.name}</span>
              <span className="cl-disc-post-time">{post.time}</span>
              {post.pinned && <span className="cl-disc-pinned">Pinned</span>}
            </div>
            <div className="cl-disc-post-body">{post.body}</div>
            <div className="cl-disc-post-foot">
              <span className="cl-disc-replies">💬 {post.replies} replies</span>
            </div>
          </div>
        ))}
      </div>
    </AppWindow>
  )
}

function EventsVisual({ rootDomain }: { rootDomain: string }) {
  return (
    <AppWindow url={`ottawacycling.${rootDomain}`} showChrome={false}>
      <div className="cl-events-header">
        <span className="cl-disc-title">Events</span>
        <span className="cl-events-sub">3 upcoming</span>
      </div>
      <div className="cl-events-list">
        {[
          { month: 'APR', day: '12', title: 'Spring Century Ride', sub: '34 attending · Outdoors', rsvp: 'Going' },
          { month: 'APR', day: '19', title: 'Annual General Meeting', sub: 'Members only · RSVP open', rsvp: 'RSVP' },
          { month: 'MAY', day: '3',  title: 'Beginner Friendly Ride', sub: '8 attending · Registration open', rsvp: 'RSVP' },
        ].map((ev, i) => (
          <div key={i} className="cl-event-row">
            <div className="cl-event-date-block">
              <div className="cl-event-month">{ev.month}</div>
              <div className="cl-event-day">{ev.day}</div>
            </div>
            <div className="cl-event-info">
              <div className="cl-event-title">{ev.title}</div>
              <div className="cl-event-sub">{ev.sub}</div>
            </div>
            <button type="button" className={`cl-event-rsvp ${ev.rsvp === 'Going' ? 'cl-rsvp-going' : ''}`}>
              {ev.rsvp}
            </button>
          </div>
        ))}
      </div>
    </AppWindow>
  )
}

export function ClubLoungeLanding({
  rootDomain,
  signupHref,
  loginHref,
  demoHref,
  internalLinks,
}: ClubLoungeLandingProps) {
  const mailto = `mailto:hello@${rootDomain}`
  const marqueeDup = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <div className="club-lounge-landing">
      {/* ── Nav ── */}
      <nav>
        <NavLink href="/" className="cl-nav-logo" internalLinks={internalLinks}>
          Club<span>Lounge</span>
        </NavLink>
        <ul className="cl-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#verticals">Who it&apos;s for</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li>
            <NavLink href={loginHref} internalLinks={internalLinks}>Log in</NavLink>
          </li>
          <li>
            <NavLink href={signupHref} className="cl-nav-cta" internalLinks={internalLinks}>Get started</NavLink>
          </li>
        </ul>
      </nav>

      {/* ── Hero ── */}
      <div className="cl-hero">
        <div className="cl-hero-left">
          <div className="cl-hero-eyebrow">Membership ops for clubs &amp; associations</div>
          <h1 className="cl-hero-h1">
            Run your club without
            <br />chasing <em>payments.</em>
          </h1>
          <p className="cl-hero-sub">
            Member directory, dues collection, private discussions, and events — in one private home
            your members will actually use. <strong>From $5/month.</strong>
          </p>
          <div className="cl-hero-actions">
            <NavLink href={signupHref} className="cl-btn-primary" internalLinks={internalLinks}>
              Get started →
            </NavLink>
            <NavLink href={demoHref} className="cl-btn-ghost" internalLinks={internalLinks}>
              See a demo
            </NavLink>
          </div>
          <div className="cl-hero-proof">
            <div>
              <div className="cl-proof-num">$5</div>
              <div className="cl-proof-label">Per month · small clubs</div>
            </div>
            <div className="cl-proof-divider" aria-hidden />
            <div>
              <div className="cl-proof-num">$0</div>
              <div className="cl-proof-label">Setup fee, ever</div>
            </div>
          </div>
        </div>
        <div className="cl-hero-right">
          <div className="cl-mockup-frame">
            <div className="cl-mock-topbar">
              <div className="cl-mock-dots">
                <div className="cl-mock-dot cl-r" /><div className="cl-mock-dot cl-y" /><div className="cl-mock-dot cl-g" />
              </div>
              <div className="cl-mock-url">ottawacycling.{rootDomain}</div>
            </div>
            <div className="cl-mock-body">
              <div className="cl-mock-club-header">
                <div className="cl-mock-avatar">OCC</div>
                <div>
                  <div className="cl-mock-club-name">Ottawa Cycling Club</div>
                  <div className="cl-mock-club-sub">247 members · Est. 1987</div>
                </div>
              </div>
              <div className="cl-mock-nav-pills">
                <div className="cl-mock-pill cl-active">Discussion</div>
                <div className="cl-mock-pill">Events</div>
                <div className="cl-mock-pill">Members</div>
                <div className="cl-mock-pill">Resources</div>
              </div>
              <div className="cl-mock-post">
                <div className="cl-mock-post-head">
                  <svg className="cl-mock-mini-av" viewBox="0 0 20 20" aria-hidden>
                    <circle cx="10" cy="10" r="10" fill="#6366f1" />
                    <text x="10" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">SL</text>
                  </svg>
                  <span className="cl-mock-post-name">Sarah L.</span>
                  <span className="cl-mock-post-time">2h ago</span>
                </div>
                <div className="cl-mock-post-body">Anyone doing the Gatineau hills ride Saturday morning? Leaving from the usual spot at 7am ☀️</div>
              </div>
              <div className="cl-mock-post">
                <div className="cl-mock-post-head">
                  <svg className="cl-mock-mini-av" viewBox="0 0 20 20" aria-hidden>
                    <circle cx="10" cy="10" r="10" fill="#f59e0b" />
                    <text x="10" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">MK</text>
                  </svg>
                  <span className="cl-mock-post-name">Mike K.</span>
                  <span className="cl-mock-post-time">5h ago</span>
                </div>
                <div className="cl-mock-post-body">New kit designs are up in Resources — vote by Friday. Three options 🚴</div>
              </div>
              <div className="cl-mock-upcoming">
                <div className="cl-mock-upcoming-label">Upcoming</div>
                <div className="cl-mock-event">
                  <div className="cl-mock-event-date">
                    <div className="cl-mock-event-month">Apr</div>
                    <div className="cl-mock-event-day">12</div>
                  </div>
                  <div>
                    <div className="cl-mock-event-title">Spring Century Ride</div>
                    <div className="cl-mock-event-sub">34 members attending</div>
                  </div>
                </div>
                <div className="cl-mock-event">
                  <div className="cl-mock-event-date">
                    <div className="cl-mock-event-month">Apr</div>
                    <div className="cl-mock-event-day">19</div>
                  </div>
                  <div>
                    <div className="cl-mock-event-title">AGM — Annual General Meeting</div>
                    <div className="cl-mock-event-sub">Members only · RSVP open</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Marquee ── */}
      <div className="cl-marquee-wrap">
        <div className="cl-marquee-track">
          {marqueeDup.map((label, i) => (
            <div key={`${label}-${i}`} className="cl-marquee-item">{label}</div>
          ))}
        </div>
      </div>

      {/* ── Feature sections ── */}
      <div id="features">

        {/* 1 — Membership & Member Card */}
        <section id="membership" className="cl-feat-section">
          <div className="cl-feat-text">
            <div className="cl-section-eyebrow">Membership</div>
            <h2 className="cl-feat-h2">
              Your roster is finally<br /><em>official.</em>
            </h2>
            <p className="cl-feat-sub">
              Every member gets a digital membership card, a profile, and a place in your private directory.
              Approval flows, membership tiers, and custom fields — so you always know who&apos;s in.
            </p>
            <ul className="cl-feat-bullets">
              <li><span className="cl-fb-check">✓</span>Approval-based or open signup</li>
              <li><span className="cl-fb-check">✓</span>Multiple membership tiers (Full, Student, Associate…)</li>
              <li><span className="cl-fb-check">✓</span>Digital membership card with member ID</li>
              <li><span className="cl-fb-check">✓</span>Members manage their own profiles</li>
            </ul>
            <NavLink href={signupHref} className="cl-btn-primary" internalLinks={internalLinks}>
              Get started →
            </NavLink>
          </div>
          <div className="cl-feat-visual">
            <MembershipVisual />
          </div>
        </section>

        {/* 2 — Dues Collection (flipped) */}
        <section id="dues" className="cl-feat-section cl-feat-flip cl-feat-alt">
          <div className="cl-feat-text">
            <div className="cl-section-eyebrow">Dues collection</div>
            <h2 className="cl-feat-h2">
              Collect dues without<br /><em>the awkward follow-up.</em>
            </h2>
            <p className="cl-feat-sub">
              Stripe-powered dues collection, built right in. Set your annual or monthly amount,
              members pay online, and renewals happen automatically. No more chasing e-transfers.
            </p>
            <ul className="cl-feat-bullets">
              <li><span className="cl-fb-check">✓</span>Stripe Connect — no third-party processor needed</li>
              <li><span className="cl-fb-check">✓</span>Annual &amp; monthly billing options</li>
              <li><span className="cl-fb-check">✓</span>Automatic renewals with email reminders</li>
              <li><span className="cl-fb-check">✓</span>See who&apos;s paid at a glance from your dashboard</li>
            </ul>
            <NavLink href={signupHref} className="cl-btn-primary" internalLinks={internalLinks}>
              Get started →
            </NavLink>
          </div>
          <div className="cl-feat-visual">
            <DuesVisual rootDomain={rootDomain} />
          </div>
        </section>

        {/* 3 — Discussions */}
        <section id="discussions" className="cl-feat-section">
          <div className="cl-feat-text">
            <div className="cl-section-eyebrow">Private discussions</div>
            <h2 className="cl-feat-h2">
              Where your members<br /><em>actually talk.</em>
            </h2>
            <p className="cl-feat-sub">
              A private discussion board that&apos;s actually organized. Threaded posts, @mentions,
              and weekly digest emails so nobody misses important news — no group chat chaos.
            </p>
            <ul className="cl-feat-bullets">
              <li><span className="cl-fb-check">✓</span>Threaded posts organized by category</li>
              <li><span className="cl-fb-check">✓</span>@mention members to notify them directly</li>
              <li><span className="cl-fb-check">✓</span>Weekly digest email keeps everyone in the loop</li>
              <li><span className="cl-fb-check">✓</span>Private to members — no public visibility</li>
            </ul>
            <NavLink href={signupHref} className="cl-btn-primary" internalLinks={internalLinks}>
              Get started →
            </NavLink>
          </div>
          <div className="cl-feat-visual">
            <div className="cl-feature-scene">
              <div className="cl-photo-card cl-feature-photo-card">
                <Image
                  src="/marketing/fat-lads-c1m8s783C0s-unsplash.jpg"
                  alt="Group of cyclists riding together on a country road"
                  width={1600}
                  height={1096}
                  className="cl-photo-image"
                />
                <div className="cl-photo-card-overlay" />
              </div>
              <div className="cl-feature-scene-window">
                <DiscussionsVisual rootDomain={rootDomain} />
              </div>
            </div>
          </div>
        </section>

        {/* 4 — Events (flipped) */}
        <section id="events" className="cl-feat-section cl-feat-flip cl-feat-alt">
          <div className="cl-feat-text">
            <div className="cl-section-eyebrow">Events &amp; RSVP</div>
            <h2 className="cl-feat-h2">
              Events your members<br /><em>actually show up to.</em>
            </h2>
            <p className="cl-feat-sub">
              Create events, open RSVPs, and see who&apos;s coming — all without leaving the lounge.
              Members register in one tap, and it syncs to their Google Calendar automatically.
            </p>
            <ul className="cl-feat-bullets">
              <li><span className="cl-fb-check">✓</span>One-click RSVP for members</li>
              <li><span className="cl-fb-check">✓</span>Google Calendar sync</li>
              <li><span className="cl-fb-check">✓</span>Members-only or public event visibility</li>
              <li><span className="cl-fb-check">✓</span>Automated RSVP reminder emails</li>
            </ul>
            <NavLink href={signupHref} className="cl-btn-primary" internalLinks={internalLinks}>
              Get started →
            </NavLink>
          </div>
          <div className="cl-feat-visual">
            <div className="cl-feature-scene">
              <div className="cl-photo-card cl-feature-photo-card">
                <Image
                  src="/marketing/kawe-rodrigues-u67yO7onlOQ-unsplash.jpg"
                  alt="Golfer celebrating beside the hole on a green"
                  width={1200}
                  height={1800}
                  className="cl-photo-image"
                />
                <div className="cl-photo-card-overlay" />
              </div>
              <div className="cl-feature-scene-window">
                <EventsVisual rootDomain={rootDomain} />
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ── Pricing ── */}
      <section id="pricing" className="cl-pricing-band">
        <div className="cl-section-eyebrow">Simple pricing</div>
        <h2 className="cl-section-title">
          Flat rate.<br /><em>Grow all you want.</em>
        </h2>
        <p className="cl-section-sub">
          No per-contact fees. No surprise bills when your membership drive works. Dues collection on every plan.
          <strong> Starts at $5/month.</strong>
        </p>
        <div className="cl-pricing-grid">
          <div className="cl-price-col">
            <div className="cl-price-tier">Hobby</div>
            <div className="cl-price-amount">$5</div>
            <div className="cl-price-billed">per month</div>
            <div className="cl-price-period">best for up to 20 members · 1 admin</div>
            <ul className="cl-price-features">
              <li><span className="cl-check">✓</span>Your own {rootDomain} URL</li>
              <li><span className="cl-check">✓</span>Member directory + approvals</li>
              <li><span className="cl-check">✓</span>1 admin seat</li>
              <li><span className="cl-check">✓</span>Events + RSVP</li>
              <li><span className="cl-check">✓</span>Announcements</li>
              <li><span className="cl-check">✓</span>Discussions</li>
              <li><span className="cl-check">✓</span>Dues collection via Stripe</li>
              <li><span className="cl-cross">—</span>Digest emails</li>
              <li><span className="cl-cross">—</span>Analytics</li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>Get started</NavLink>
          </div>
          <div className="cl-price-col">
            <div className="cl-price-tier">Core</div>
            <div className="cl-price-amount">$49</div>
            <div className="cl-price-billed">per month</div>
            <div className="cl-price-period">best for up to 200 members · 2 admins</div>
            <ul className="cl-price-features">
              <li><span className="cl-check">✓</span>Everything in Hobby</li>
              <li><span className="cl-check">✓</span>Member invitations</li>
              <li><span className="cl-check">✓</span>Recommended for up to 2 admins</li>
              <li><span className="cl-cross">—</span>Custom domain</li>
              <li><span className="cl-cross">—</span>Remove ClubLounge branding</li>
              <li><span className="cl-cross">—</span>Digest emails</li>
              <li><span className="cl-cross">—</span>Analytics</li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>Get started</NavLink>
          </div>
          <div className="cl-price-col cl-featured">
            <div className="cl-featured-badge">Most popular</div>
            <div className="cl-price-tier">Growth</div>
            <div className="cl-price-amount">$99</div>
            <div className="cl-price-billed">per month</div>
            <div className="cl-price-period">best for up to 500 members · 5 admins</div>
            <ul className="cl-price-features">
              <li><span className="cl-check">✓</span>Everything in Core</li>
              <li><span className="cl-check">✓</span>Recommended for up to 5 admins</li>
              <li><span className="cl-check">✓</span>Custom domain</li>
              <li><span className="cl-check">✓</span>Remove ClubLounge branding</li>
              <li><span className="cl-check">✓</span>Weekly digest emails</li>
              <li><span className="cl-check">✓</span>Analytics dashboard</li>
              <li><span className="cl-check">✓</span>Multiple membership tiers</li>
              <li><span className="cl-check">✓</span>Member trial periods</li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>Get started</NavLink>
          </div>
          <div className="cl-price-col">
            <div className="cl-price-tier">Pro</div>
            <div className="cl-price-amount">$199</div>
            <div className="cl-price-billed">per month</div>
            <div className="cl-price-period">larger clubs · higher-touch support</div>
            <ul className="cl-price-features">
              <li><span className="cl-check">✓</span>Everything in Growth</li>
              <li><span className="cl-check">✓</span>White-glove migration help</li>
              <li><span className="cl-check">✓</span>Admin onboarding + team training</li>
              <li><span className="cl-check">✓</span>Priority support</li>
              <li><span className="cl-check">✓</span>Custom billing / invoicing</li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>Get started</NavLink>
          </div>
        </div>
        <p className="cl-pricing-footnote">
          Monthly pricing shown. New lounges start on Hobby, and plan changes happen from your billing settings. Stripe fees apply, plus a 2% ClubLounge platform fee on dues payments.
        </p>
        <a
          href="https://tipa.ca"
          target="_blank"
          rel="noreferrer"
          className="cl-bottom-trust"
        >
          <span className="cl-bottom-trust-logo">
            <Image
              src="/logo.png"
              alt="Toronto Island Pilots Association logo"
              width={493}
              height={329}
            />
          </span>
          <span className="cl-bottom-trust-copy">
            Trusted by <strong>Toronto Island Pilots Association</strong>
          </span>
        </a>
      </section>

      {/* ── Verticals ── */}
      <section id="verticals">
        <div className="cl-section-eyebrow">Built for every kind of club</div>
        <h2 className="cl-section-title">
          Every club has<br /><em>a lounge now.</em>
        </h2>
        <p className="cl-section-sub">
          From 30-person hobby societies to 800-person yacht clubs. If your members pay dues and deserve a community,
          you&apos;re our customer.
        </p>
        <div className="cl-verticals-grid">
          {VERTICALS.map(v => (
            <div key={v.title} className="cl-vert-card">
              <span className="cl-vert-icon">{v.icon}</span>
              <div className="cl-vert-title">{v.title}</div>
              <div className="cl-vert-sub">{v.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="cl-faq-section">
        <div className="cl-section-eyebrow">FAQ</div>
        <h2 className="cl-section-title">Common questions</h2>
        <dl className="cl-faq-list">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="cl-faq-item">
              <dt className="cl-faq-q">{q}</dt>
              <dd className="cl-faq-a">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── CTA ── */}
      <section className="cl-cta-section">
        <h2 className="cl-cta-title">
          Make your club official.<br />Start today.
        </h2>
        <p className="cl-cta-sub">From $5/month for small clubs. No setup fee. Live in 48 hours.</p>
        <form className="cl-cta-form" action={signupHref} method="get">
          <input
            type="email" name="email" className="cl-cta-input"
            placeholder="your@email.com" autoComplete="email" aria-label="Email address"
          />
          <button type="submit" className="cl-btn-primary">Get started →</button>
        </form>
        <p className="cl-cta-note">Already on Wild Apricot? We&apos;ll migrate your members for free.</p>
      </section>

      {/* ── Footer ── */}
      <footer>
        <NavLink href="/" className="cl-footer-logo" internalLinks={internalLinks}>
          Club<span>Lounge</span>
        </NavLink>
        <ul className="cl-footer-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><NavLink href={loginHref} internalLinks={internalLinks}>Log in</NavLink></li>
          <li><a href="/docs">Docs</a></li>
          <li><a href={mailto}>Contact</a></li>
        </ul>
        <div className="cl-footer-copy">
          © {new Date().getFullYear()} Club Lounge · {rootDomain}
        </div>
      </footer>
    </div>
  )
}
