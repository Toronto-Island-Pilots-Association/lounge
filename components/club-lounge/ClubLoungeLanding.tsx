import Link from 'next/link'
import type { ReactNode } from 'react'

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
    a: 'Plans start at $5/month for small clubs (up to 20 members). Starter is $49/month for unlimited members with dues collection. Community is $99/month and adds digest emails and an analytics dashboard. All plans include a 14-day free trial — no credit card required.',
  },
  {
    q: 'Can I migrate from Wild Apricot?',
    a: 'Yes. We offer free member data migration from Wild Apricot, typically completed within 48 hours of signing up.',
  },
  {
    q: "Do members get a URL that's actually ours?",
    a: 'Every club gets its own subdomain (yourclub.clublounge.app). Starter plan and above support a fully custom domain like lounge.yourclub.com — your DNS, your brand.',
  },
  {
    q: 'How does dues collection work?',
    a: 'Club Lounge uses Stripe Connect. Set your annual or monthly dues amount and members pay directly. Automatic renewals, instant payment records, and a real-time view of who has paid — all from your admin dashboard. Available on Starter and above.',
  },
  {
    q: 'What types of clubs use Club Lounge?',
    a: 'Flying clubs, yacht clubs, cycling clubs, golf clubs, rowing clubs, photography societies, professional association chapters, and alumni associations. Any club that needs a private community home.',
  },
] as const

const VERTICALS = [
  { icon: '✈️', title: 'Flying clubs & airports', body: 'A community layer alongside your scheduling software. Where pilots actually talk to each other.' },
  { icon: '⛵', title: 'Yacht & sailing clubs', body: 'Complex membership tiers, social calendars, fleet communications — all in one private space.' },
  { icon: '⛳', title: 'Golf clubs', body: "The community layer your booking app doesn't have. Member retention starts with members knowing each other." },
  { icon: '🚴', title: 'Cycling & triathlon clubs', body: 'Replace the Facebook group and the spreadsheet. Ride sign-ups, kit votes, and route sharing — all in one place.' },
  { icon: '🚣', title: 'Rowing & paddling clubs', body: 'Junior, masters, and university programs all in one lounge. Parents, coaches, and members on the same page.' },
  { icon: '🏛️', title: 'Professional chapters', body: "Engineering, legal, medical, real estate association chapters. The private hub your national body doesn't provide." },
] as const

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

function AppWindow({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="cl-app-window">
      <div className="cl-app-topbar">
        <div className="cl-mock-dots">
          <div className="cl-mock-dot cl-r" /><div className="cl-mock-dot cl-y" /><div className="cl-mock-dot cl-g" />
        </div>
        <div className="cl-mock-url">{url}</div>
      </div>
      <div className="cl-app-body">{children}</div>
    </div>
  )
}

function MembershipVisual({ rootDomain }: { rootDomain: string }) {
  return (
    <AppWindow url={`tipa.${rootDomain}`}>
      {/* Membership card */}
      <div className="cl-mc-card">
        <div className="cl-mc-top">
          <div className="cl-mc-org">TORONTO ISLAND PILOTS ASSOC.</div>
          <div className="cl-mc-badge">✈</div>
        </div>
        <div className="cl-mc-name">Sarah Mitchell</div>
        <div className="cl-mc-level-row">
          <span className="cl-mc-level">Full Member</span>
          <span className="cl-mc-since">Member since 2019</span>
        </div>
        <div className="cl-mc-id">#1042</div>
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
    </AppWindow>
  )
}

function DuesVisual({ rootDomain }: { rootDomain: string }) {
  return (
    <AppWindow url={`admin.${rootDomain}`}>
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
    <AppWindow url={`ottawacycling.${rootDomain}`}>
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
    <AppWindow url={`ottawacycling.${rootDomain}`}>
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
          <div className="cl-hero-eyebrow">For clubs, associations &amp; facilities</div>
          <h1 className="cl-hero-h1">
            The lounge that makes
            <br />your club <em>official.</em>
          </h1>
          <p className="cl-hero-sub">
            Member directory, dues collection, private discussions, and events —
            in one private home your members will actually use.{' '}
            <strong>From $5/month.</strong>
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
              <div className="cl-proof-num">48h</div>
              <div className="cl-proof-label">Migration from Wild Apricot</div>
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
        <section className="cl-feat-section">
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
            <MembershipVisual rootDomain={rootDomain} />
          </div>
        </section>

        {/* 2 — Dues Collection (flipped) */}
        <section className="cl-feat-section cl-feat-flip cl-feat-alt">
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
        <section className="cl-feat-section">
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
            <DiscussionsVisual rootDomain={rootDomain} />
          </div>
        </section>

        {/* 4 — Events (flipped) */}
        <section className="cl-feat-section cl-feat-flip cl-feat-alt">
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
            <EventsVisual rootDomain={rootDomain} />
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
          No per-contact fees. No surprise bills when your membership drive works. Plans from $5/month;
          unlimited members on Starter and above. <strong>14-day free trial on all plans.</strong>
        </p>
        <div className="cl-pricing-grid">
          <div className="cl-price-col">
            <div className="cl-price-tier">Hobby</div>
            <div className="cl-price-amount">$5</div>
            <div className="cl-price-period">per month · up to 20 members</div>
            <ul className="cl-price-features">
              <li><span className="cl-check">✓</span>Your own {rootDomain} URL</li>
              <li><span className="cl-check">✓</span>Member directory + approvals</li>
              <li><span className="cl-check">✓</span>Events + RSVP</li>
              <li><span className="cl-check">✓</span>Announcements</li>
              <li><span className="cl-check">✓</span>Discussions</li>
              <li><span className="cl-cross">—</span>Dues collection via Stripe</li>
              <li><span className="cl-cross">—</span>Digest emails</li>
              <li><span className="cl-cross">—</span>Analytics</li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>Start free trial</NavLink>
          </div>
          <div className="cl-price-col">
            <div className="cl-price-tier">Starter</div>
            <div className="cl-price-amount">$49</div>
            <div className="cl-price-period">per month · unlimited members</div>
            <ul className="cl-price-features">
              <li><span className="cl-check">✓</span>Everything in Hobby</li>
              <li><span className="cl-check">✓</span>Dues collection via Stripe</li>
              <li><span className="cl-check">✓</span>Unlimited members</li>
              <li><span className="cl-check">✓</span>2 admin seats</li>
              <li><span className="cl-check">✓</span>Custom domain</li>
              <li><span className="cl-check">✓</span>Remove ClubLounge branding</li>
              <li><span className="cl-cross">—</span>Digest emails</li>
              <li><span className="cl-cross">—</span>Analytics</li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>Get started</NavLink>
          </div>
          <div className="cl-price-col cl-featured">
            <div className="cl-featured-badge">Most popular</div>
            <div className="cl-price-tier">Community</div>
            <div className="cl-price-amount">$99</div>
            <div className="cl-price-period">per month · unlimited everything</div>
            <ul className="cl-price-features">
              <li><span className="cl-check">✓</span>Everything in Starter</li>
              <li><span className="cl-check">✓</span>Unlimited admins</li>
              <li><span className="cl-check">✓</span>Private discussions + @mentions</li>
              <li><span className="cl-check">✓</span>Weekly digest emails</li>
              <li><span className="cl-check">✓</span>Analytics dashboard</li>
              <li><span className="cl-check">✓</span>Google Calendar sync</li>
              <li><span className="cl-check">✓</span>Member invites</li>
              <li><span className="cl-check">✓</span>Priority support</li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>Get started</NavLink>
          </div>
          <div className="cl-price-col">
            <div className="cl-price-tier">Club Pro</div>
            <div className="cl-price-amount">$199</div>
            <div className="cl-price-period">per month · white-label</div>
            <ul className="cl-price-features">
              <li><span className="cl-check">✓</span>Everything in Community</li>
              <li><span className="cl-check">✓</span>Multiple membership tiers</li>
              <li><span className="cl-check">✓</span>API access + data export</li>
              <li><span className="cl-check">✓</span>SSO / custom auth</li>
              <li><span className="cl-check">✓</span>Onboarding call</li>
              <li><span className="cl-check">✓</span>Annual contract option</li>
            </ul>
            <a href={mailto} className="cl-price-btn">Book a demo</a>
          </div>
        </div>
        <p className="cl-pricing-footnote">
          14-day free trial, no credit card required. Save 2 months with annual billing. Canadian dollars. No hidden fees.
        </p>
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
