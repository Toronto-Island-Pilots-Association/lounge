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

const FEATURES = [
  {
    icon: '👤',
    title: 'Member directory',
    body: 'A searchable, private directory of every member. Approval flows, member tiers, profile fields. Members manage their own info.',
  },
  {
    icon: '💬',
    title: 'Private discussions',
    body: 'Threaded conversations, @mentions, and weekly digest emails. Your Facebook group, but private, organized, and actually yours.',
  },
  {
    icon: '📅',
    title: 'Events & RSVP',
    body: 'Create events, manage RSVPs, sync to Google Calendar. Members register in one click. No more reply-all email chains.',
  },
  {
    icon: '💳',
    title: 'Dues on autopilot',
    body: "Stripe-powered. Annual or monthly dues, automatic renewals, instant payment records. See who's paid at a glance.",
  },
  {
    icon: '📁',
    title: 'Resources & announcements',
    body: 'A private library for your club — rulebooks, forms, newsletters, links. Pinned announcements members actually see.',
  },
  {
    icon: '📊',
    title: 'Admin analytics',
    body: "Member growth, dues collected, engagement by discussion category, event attendance. Know what's working.",
  },
] as const

const VERTICALS = [
  {
    icon: '✈️',
    title: 'Flying clubs & airports',
    body: 'A community layer alongside your scheduling software. Where pilots actually talk to each other.',
  },
  {
    icon: '⛵',
    title: 'Yacht & sailing clubs',
    body: 'Complex membership tiers, social calendars, fleet communications — all in one private space.',
  },
  {
    icon: '⛳',
    title: 'Golf clubs',
    body: "The community layer your booking app doesn't have. Member retention starts with members knowing each other.",
  },
  {
    icon: '🚴',
    title: 'Cycling & triathlon clubs',
    body: 'Replace the Facebook group and the spreadsheet. Ride sign-ups, kit votes, and route sharing — all in one place.',
  },
  {
    icon: '🚣',
    title: 'Rowing & paddling clubs',
    body: 'Junior, masters, and university programs all in one lounge. Parents, coaches, and members on the same page.',
  },
  {
    icon: '🏛️',
    title: 'Professional chapters',
    body: "Engineering, legal, medical, real estate association chapters. The private hub your national body doesn't provide.",
  },
] as const

export type ClubLoungeLandingProps = {
  rootDomain: string
  /** Same-host paths when internalLinks is true; full URLs when false. */
  signupHref: string
  demoHref: string
  internalLinks: boolean
}

function NavLink({
  href,
  className,
  children,
  internalLinks,
}: {
  href: string
  className?: string
  children: ReactNode
  internalLinks: boolean
}) {
  if (internalLinks) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

export function ClubLoungeLanding({
  rootDomain,
  signupHref,
  demoHref,
  internalLinks,
}: ClubLoungeLandingProps) {
  const mailto = `mailto:hello@${rootDomain}`
  const marqueeDup = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <div className="club-lounge-landing">
      <nav>
        <NavLink href="/" className="cl-nav-logo" internalLinks={internalLinks}>
          Club<span>Lounge</span>
        </NavLink>
        <ul className="cl-nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#pricing">Pricing</a>
          </li>
          <li>
            <a href="#verticals">Who it&apos;s for</a>
          </li>
          <li>
            <NavLink href={signupHref} className="cl-nav-cta" internalLinks={internalLinks}>
              Get started
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="cl-hero">
        <div className="cl-hero-left">
          <div className="cl-hero-eyebrow">For clubs, associations & facilities</div>
          <h1 className="cl-hero-h1">
            Every club deserves
            <br />a <em>proper lounge.</em>
          </h1>
          <p className="cl-hero-sub">
            Give your members a private home — directory, discussions, events, and Stripe-powered dues on higher plans.
            Your club, your URL. <strong>From $5/month.</strong>
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
                <div className="cl-mock-dot cl-r" />
                <div className="cl-mock-dot cl-y" />
                <div className="cl-mock-dot cl-g" />
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
                    <circle cx="10" cy="10" r="10" fill="#2cdbb0" />
                    <text x="10" y="14" textAnchor="middle" fill="#050607" fontSize="9" fontWeight="bold">
                      SL
                    </text>
                  </svg>
                  <span className="cl-mock-post-name">Sarah L.</span>
                  <span className="cl-mock-post-time">2h ago</span>
                </div>
                <div className="cl-mock-post-body">
                  Anyone doing the Gatineau hills ride Saturday morning? Leaving from the usual spot at 7am ☀️
                </div>
              </div>
              <div className="cl-mock-post">
                <div className="cl-mock-post-head">
                  <svg className="cl-mock-mini-av" viewBox="0 0 20 20" aria-hidden>
                    <circle cx="10" cy="10" r="10" fill="#ffb84d" />
                    <text x="10" y="14" textAnchor="middle" fill="#050607" fontSize="9" fontWeight="bold">
                      MK
                    </text>
                  </svg>
                  <span className="cl-mock-post-name">Mike K.</span>
                  <span className="cl-mock-post-time">5h ago</span>
                </div>
                <div className="cl-mock-post-body">
                  New kit designs are up in Resources — vote by Friday. Three options 🚴
                </div>
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

      <div className="cl-marquee-wrap">
        <div className="cl-marquee-track">
          {marqueeDup.map((label, i) => (
            <div key={`${label}-${i}`} className="cl-marquee-item">
              {label}
            </div>
          ))}
        </div>
      </div>

      <section>
        <div className="cl-section-eyebrow">Your club&apos;s own address</div>
        <h2 className="cl-section-title">
          Not generic software.
          <br />
          <em>Your club&apos;s lounge.</em>
        </h2>
        <p className="cl-section-sub">
          Every club gets its own URL. Members bookmark it, share it, and find their way back. It&apos;s not a tenant in
          someone else&apos;s platform — it&apos;s yours.
        </p>
        <div className="cl-url-showcase">
          <div className="cl-url-label">Your URL</div>
          <div className="cl-url-value">
            <span className="cl-org">yourclub</span>
            <span className="cl-domain">.{rootDomain}</span>
          </div>
        </div>
        <p className="cl-url-follow">
          Every invite email, every event link, every &quot;join our community&quot; message — your club&apos;s name,
          front and centre.
        </p>
      </section>

      <section id="features">
        <div className="cl-section-eyebrow">Everything your club needs</div>
        <h2 className="cl-section-title">
          One lounge.
          <br />
          <em>No more scattered tools.</em>
        </h2>
        <p className="cl-section-sub">
          Stop juggling Facebook groups, email threads, Google Sheets, and Interac e-transfers. It&apos;s all here.
        </p>
        <div className="cl-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="cl-feature-cell">
              <div className="cl-feature-icon">{f.icon}</div>
              <div className="cl-feature-title">{f.title}</div>
              <div className="cl-feature-body">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="cl-pricing-band">
        <div className="cl-section-eyebrow">Simple pricing</div>
        <h2 className="cl-section-title">
          Flat rate.
          <br />
          <em>Grow all you want.</em>
        </h2>
        <p className="cl-section-sub">
          No per-contact fees. No surprise bills when your membership drive works. Plans from $5/month; unlimited
          members on Starter and above.
        </p>
        <div className="cl-pricing-grid">
          <div className="cl-price-col">
            <div className="cl-price-tier">Hobby</div>
            <div className="cl-price-amount">$5</div>
            <div className="cl-price-period">per month · up to 20 members</div>
            <ul className="cl-price-features">
              <li>
                <span className="cl-check">✓</span>Your own {rootDomain} URL
              </li>
              <li>
                <span className="cl-check">✓</span>Member directory + approvals
              </li>
              <li>
                <span className="cl-check">✓</span>Events + RSVP
              </li>
              <li>
                <span className="cl-check">✓</span>Announcements
              </li>
              <li>
                <span className="cl-cross">—</span>Dues collection via Stripe
              </li>
              <li>
                <span className="cl-cross">—</span>Discussions
              </li>
              <li>
                <span className="cl-cross">—</span>Digest emails
              </li>
              <li>
                <span className="cl-cross">—</span>Analytics
              </li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>
              Subscribe
            </NavLink>
          </div>
          <div className="cl-price-col">
            <div className="cl-price-tier">Starter</div>
            <div className="cl-price-amount">$49</div>
            <div className="cl-price-period">per month · unlimited members</div>
            <ul className="cl-price-features">
              <li>
                <span className="cl-check">✓</span>Everything in Hobby
              </li>
              <li>
                <span className="cl-check">✓</span>Dues collection via Stripe
              </li>
              <li>
                <span className="cl-check">✓</span>Unlimited members
              </li>
              <li>
                <span className="cl-check">✓</span>2 admin seats
              </li>
              <li>
                <span className="cl-check">✓</span>Custom domain
              </li>
              <li>
                <span className="cl-check">✓</span>Remove ClubLounge branding
              </li>
              <li>
                <span className="cl-cross">—</span>Discussions
              </li>
              <li>
                <span className="cl-cross">—</span>Digest emails
              </li>
              <li>
                <span className="cl-cross">—</span>Analytics
              </li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>
              Get started
            </NavLink>
          </div>
          <div className="cl-price-col cl-featured">
            <div className="cl-featured-badge">Most popular</div>
            <div className="cl-price-tier">Community</div>
            <div className="cl-price-amount">$99</div>
            <div className="cl-price-period">per month · unlimited everything</div>
            <ul className="cl-price-features">
              <li>
                <span className="cl-check">✓</span>Everything in Starter
              </li>
              <li>
                <span className="cl-check">✓</span>Unlimited admins
              </li>
              <li>
                <span className="cl-check">✓</span>Private discussions + @mentions
              </li>
              <li>
                <span className="cl-check">✓</span>Weekly digest emails
              </li>
              <li>
                <span className="cl-check">✓</span>Analytics dashboard
              </li>
              <li>
                <span className="cl-check">✓</span>Google Calendar sync
              </li>
              <li>
                <span className="cl-check">✓</span>Member invites
              </li>
              <li>
                <span className="cl-check">✓</span>Priority support
              </li>
            </ul>
            <NavLink href={signupHref} className="cl-price-btn" internalLinks={internalLinks}>
              Get started
            </NavLink>
          </div>
          <div className="cl-price-col">
            <div className="cl-price-tier">Club Pro</div>
            <div className="cl-price-amount">$199</div>
            <div className="cl-price-period">per month · white-label</div>
            <ul className="cl-price-features">
              <li>
                <span className="cl-check">✓</span>Everything in Community
              </li>
              <li>
                <span className="cl-check">✓</span>Multiple membership tiers
              </li>
              <li>
                <span className="cl-check">✓</span>API access + data export
              </li>
              <li>
                <span className="cl-check">✓</span>SSO / custom auth
              </li>
              <li>
                <span className="cl-check">✓</span>Onboarding call
              </li>
              <li>
                <span className="cl-check">✓</span>Annual contract option
              </li>
            </ul>
            <a href={mailto} className="cl-price-btn">
              Book a demo
            </a>
          </div>
        </div>
        <p className="cl-pricing-footnote">
          Save 2 months with annual billing. Canadian dollars. No hidden fees.
        </p>
      </section>

      <section className="cl-testimonial-section">
        <blockquote className="cl-testimonial-quote">
          &ldquo;We went from email chaos and a Facebook group nobody checked to having everything in one place. Our
          members actually know each other now.&rdquo;
        </blockquote>
        <div className="cl-testimonial-attr">
          <div className="cl-test-av">JD</div>
          <div>
            <div className="cl-test-name">James D.</div>
            <div className="cl-test-role">President, Toronto Island Pilots Association</div>
          </div>
        </div>
      </section>

      <section id="verticals">
        <div className="cl-section-eyebrow">Built for every kind of club</div>
        <h2 className="cl-section-title">
          Every club has
          <br />
          <em>a lounge now.</em>
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

      <section className="cl-cta-section">
        <h2 className="cl-cta-title">
          Your club deserves
          <br />a proper lounge.
        </h2>
        <p className="cl-cta-sub">From $5/month for small clubs. No setup fee. Live in 48 hours.</p>
        <form className="cl-cta-form" action={signupHref} method="get">
          <input
            type="email"
            name="email"
            className="cl-cta-input"
            placeholder="your@email.com"
            autoComplete="email"
            aria-label="Email address"
          />
          <button type="submit" className="cl-btn-primary">
            Get started →
          </button>
        </form>
        <p className="cl-cta-note">Already on Wild Apricot? We&apos;ll migrate your members for free.</p>
      </section>

      <footer>
        <NavLink href="/" className="cl-footer-logo" internalLinks={internalLinks}>
          Club<span>Lounge</span>
        </NavLink>
        <ul className="cl-footer-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#pricing">Pricing</a>
          </li>
          <li>
            <a href={mailto}>Contact</a>
          </li>
        </ul>
        <div className="cl-footer-copy">
          © {new Date().getFullYear()} Club Lounge · {rootDomain}
        </div>
      </footer>
    </div>
  )
}
