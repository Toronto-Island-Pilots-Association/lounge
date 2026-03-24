# ClubLounge — Product Requirements Document

**Last updated:** March 2026
**Status:** Pre-launch (feature/multi-tenancy branch)

---

## 1. Product Overview

ClubLounge is a **multi-tenant membership management platform** for small and mid-size clubs and associations. Each club ("org") gets a branded subdomain (`[slug].clublounge.app`) or custom domain, where their members sign up, pay dues, read announcements, attend events, and discuss things.

The platform layer (`platform.clublounge.app`) is where club admins create and manage their org, upgrade their plan, and connect Stripe for dues collection.

**Current origin:** Built on top of the TIPA (Toronto Island Pilots Association) single-tenant app. TIPA runs as the `tipa` org and retains some aviation-specific fields and logic. Once multi-tenancy is stable, TIPA migrates cleanly and legacy complexity is removed.

---

## 2. Users

### Club Admin
Creates an org on the platform, configures it, invites or approves members, posts content. Has access to the admin panel at `/admin` within their org. Also has a "Platform" link in the nav to return to the platform dashboard.

### Club Member
Signs up via the org's `/become-a-member` page (or is invited by an admin). After approval and payment they access discussions, events, announcements, and the member directory.

### Guest (unauthenticated)
Can browse public orgs in read-only mode. Sees a banner prompting them to sign in or apply. Write actions (RSVP, post, react) are hidden.

### Platform Super-Admin (internal)
Not yet formally implemented. Currently managed via direct Supabase access.

---

## 3. Domain Routing

Handled in `proxy.ts` (Next.js middleware):

| Domain | Type | Renders |
|--------|------|---------|
| `clublounge.app` | `marketing` | `/marketing/*` |
| `platform.clublounge.app` | `platform` | `/platform/*` |
| `[slug].clublounge.app` or custom domain | `org` | `/` (unchanged) |

Headers set for downstream use:
- `x-domain-type` — `marketing`, `platform`, or `org`
- `x-org-id` — UUID of the org
- `x-org-slug` — slug of the org

Local dev: `?__domain=tipa` query param simulates a subdomain.

---

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Payments — member dues | Stripe Connect (per-org Express accounts) |
| Payments — platform billing | Stripe (platform Stripe account) |
| Email | Resend |
| Hosting | Vercel (wildcard `*.clublounge.app` domain) |
| File storage | Supabase Storage (buckets: `events`, `resources`, `profile-pictures`) |

---

## 5. Database Schema

### Core tables

| Table | Description |
|-------|-------------|
| `organizations` | One row per org. Has `slug`, `plan`, `trial_ends_at`, `stripe_account_id`, `stripe_onboarding_complete`, `custom_domain`. |
| `user_profiles` | Global identity — one row per user across all orgs. Name, email, address, profile picture. |
| `org_memberships` | Per-org membership — one row per (user, org). Role, status, payment info, aviation-specific legacy fields, `custom_data`. |
| `member_profiles` | **VIEW** joining `org_memberships` + `user_profiles`. Primary read target for member data. |
| `settings` | Key-value per org. Feature flags, labels, email templates, membership config, identity. |
| `threads` | Discussion posts scoped to an org. |
| `comments` | Replies to threads. |
| `reactions` | Emoji reactions on threads and comments. |
| `events` | Calendar events with optional image and location. |
| `event_rsvps` | Who has RSVP'd to an event. |
| `resources` | Announcements / documents with optional file and image attachments. |
| `notifications` | In-app notifications per member. |
| `payments` | Payment records for member dues. |

### Key rule
Every query against a tenant table **must** be filtered by `org_id`. No exceptions.

---

## 6. Member Lifecycle

```
signup → pending → admin approves → approved
                                    ↓
                             (dues paid if required)
                                    ↓
                                active member
                                    ↓
                         (subscription expires) → expired
```

### Self-signup
1. User completes `/become-a-member` form or Google OAuth
2. Profile created with `status = 'pending'`
3. Admin reviews and approves from `/admin/members`
4. On approval, `member_number` auto-assigned (DB trigger)
5. If dues required, member pays via Stripe or PayPal

### Admin-invited
1. Admin invites via `/admin/members` — account created with temp password
2. Member receives email with temp password
3. Member logs in → `requiresPasswordChange: true`
4. Member changes password → status set to `approved`

### Org creation (admin perspective)
1. Admin signs up on `platform.clublounge.app/signup`
2. Org created on `hobby` plan with 14-day free trial (Starter features)
3. Platform dashboard shows setup checklist:
   - ✅ Create your lounge
   - ⬜ Connect Stripe to collect dues
   - ⬜ Customize your club (logo / display name)
   - ⬜ Add your first member

---

## 7. Plans & Pricing

| Plan | Price | Members | Key features |
|------|-------|---------|-------------|
| **Hobby** | $5/mo | Up to 20 | Discussions, Events, Announcements, Member directory |
| **Starter** | $49/mo | Unlimited | + Stripe dues, custom domain, remove branding, member invitations |
| **Community** | $99/mo | Unlimited | + Digest emails, analytics |
| **Club Pro** | $199/mo | Unlimited | + Membership tiers |

All new orgs start with a **14-day free trial** at Starter level. No credit card required to start.

Plans are defined in `lib/plans.ts`. The `getOrgPlan()` function in `lib/settings.ts` returns `'starter'` during an active trial even if the org is on `hobby`.

---

## 8. Feature Flags

Stored in the `settings` table per org, enforced server-side. Each feature is gated by both the org's plan ceiling and the admin's toggle.

| Flag key | What it controls |
|----------|-----------------|
| `feature_discussions` | Discussion board |
| `feature_events` | Events + RSVP |
| `feature_resources` | Announcements / documents |
| `feature_member_directory` | Member directory page |
| `require_member_approval` | Whether new signups need admin approval |
| `allow_member_invitations` | Whether approved members can invite others |
| `discussions_label` | Nav label for discussions (e.g. "Hangar Talk" for TIPA) |
| `events_label` | Nav label for events |
| `resources_label` | Nav label for announcements |

Admins manage these in **Admin → Settings → Features tab**.

---

## 9. Auth

- Supabase Auth handles sessions
- Cookies set on root domain (`.clublounge.app`) — shared across all subdomains
- Google OAuth is centralised on platform domain to avoid registering every subdomain
- `lib/auth.ts` exports `requireAuth()`, `requireAdmin()`, `getCurrentUser()`, etc. — all org-scoped via `x-org-id` header
- `shouldRequirePayment(profile)` — returns `false` for admins and Honorary members
- `shouldRequireProfileCompletion(profile)` — true if address/name fields missing

---

## 10. Email

Handled by Resend via `lib/resend.ts`.

Triggered emails:
- Welcome / approval
- Membership expiry reminders (3 automated nudges)
- Pending member nudges to complete signup
- Event notifications
- New member "introduce yourself" prompt on approval

Email templates are customisable per org via **Admin → Settings → Emails tab**.

---

## 11. Payments

### Member dues (Stripe Connect)
- Each org connects their own Stripe Express account via **Admin → Settings → Integrations**
- Dues collected through org's Stripe account; platform takes no cut currently
- Webhooks at `/api/stripe/webhook` sync subscription status to `org_memberships`
- PayPal also supported for member dues (legacy TIPA integration)

### Platform billing (org subscriptions)
- Platform has its own Stripe account (separate from org Stripe Connect)
- Plan upgrades/downgrades via `/api/platform/orgs/[orgId]/plan/upgrade`
- Webhooks at `/api/platform/stripe/webhook` sync plan to `organizations`
- Billing page at `platform.clublounge.app/platform/dashboard/[orgId]/billing`

---

## 12. Public / Guest Mode

An org can be made publicly accessible without login by setting `public_access = 'true'` in its `settings` table.

When enabled:
- Unauthenticated visitors see discussions, events, resources, members in read-only mode
- `GuestBanner` component shown with links to sign in / apply
- All write actions (post, RSVP, react, comment) hidden
- API routes use service role client + org ID from headers for guest reads
- `/api/profile` returns `{ isGuest: true }` instead of 401

---

## 13. Admin Panel

Located at `/admin/*` within each org. Accessible only to members with `role = 'admin'`.

| Section | What it does |
|---------|-------------|
| `/admin` | Dashboard: pending members, quick stats |
| `/admin/members` | Approve, invite, manage, export members |
| `/admin/events` | Create and manage events |
| `/admin/resources` | Post and manage announcements |
| `/admin/payments` | View payment history |
| `/admin/analytics` | Member growth, engagement (Community+ plan) |
| `/admin/settings` | Full org configuration (see below) |

### Settings tabs
- **Club** — display name, description, contact email, website, accent color, timezone, logo
- **Features** — toggle sections on/off, rename nav labels
- **Membership** — enabled levels, fees, trial config, auto-renewal
- **Signup** — which fields appear on the become-a-member form
- **Emails** — custom HTML templates per email type
- **Integrations** — Stripe Connect, custom domain DNS

---

## 14. Current State & Known Gaps

### Fully built ✅
- Multi-tenant architecture (domain routing, org isolation, auth)
- Platform dashboard and org creation flow
- 14-day free trial for new orgs
- Setup checklist for new org admins
- Full admin panel (members, events, resources, payments, settings)
- Member lifecycle (signup, approval, payment, expiry)
- Discussions with categories, comments, reactions
- Events with RSVP, Google Calendar export
- Announcements / resources with file attachments
- Member directory
- Public / guest read-only mode
- Configurable nav labels per org (TIPA keeps "Hangar Talk")
- Email flows (welcome, approval, expiry, reminders, event notifications)
- Google OAuth via platform domain
- Mobile API support (Bearer token auth)
- Stripe Connect for member dues + platform Stripe for org billing
- Plan-based feature gating

### Known gaps / in progress 🟡
- **Feature gating enforcement audit** — plan flags defined but not verified enforced in all API routes
- **Analytics** — placeholder exists at `/admin/analytics`, not fully implemented
- **Digest emails** — defined in plans as Community+ but sending logic not confirmed built
- **Org deletion** — no self-serve way to delete an org and its data
- **Invoice / receipt system** — payment records exist in DB but no admin-facing invoice view
- **Custom domain DNS validation** — tells user to add CNAME but doesn't verify it worked
- **Bulk member invite** (CSV upload) — single invite works; bulk not confirmed

### TIPA legacy (to clean up post-launch) 🔴
- Aviation-specific fields on `org_memberships` (`pilot_license_type`, `aircraft_type`, `call_sign`, etc.) — new orgs use `custom_data`
- `appendMemberToSheet()` Google Sheets integration — TIPA-only
- Fixed Sept 1 trial expiry logic in `change-password` — TIPA-specific, needs to become org-configurable
- `isTipa` flag checks in auth callback

---

## 15. Environment & Infrastructure

### Supabase projects
| Project | Purpose |
|---------|---------|
| `lounge` | **Production — never touch directly** |
| `lounge-dev` | Dev DB for TIPA |
| `clublounge-dev` (ref: `hibzyotkqxqalxusizwz`) | Multi-tenant dev — currently active |

Switch with: `supabase link --project-ref hibzyotkqxqalxusizwz`

### Key env vars
- `NEXT_PUBLIC_ROOT_DOMAIN` — `clublounge.app`
- `SUPABASE_SERVICE_ROLE_KEY` — for service role operations
- `STRIPE_SECRET_KEY` — org Stripe Connect
- `STRIPE_PLATFORM_SECRET_KEY` — platform billing Stripe
- `RESEND_API_KEY` — email sending
- `VERCEL_API_TOKEN` — for custom domain registration

### Demo org
- **URL:** `demo.clublounge.app`
- **Name:** Lakeside Sports Club
- **Purpose:** Marketing / sales demo, publicly accessible (no login required)
- **Admin login:** `admin@demo.clublounge.app` / `DemoAdmin2024!`
- **Seed script:** `scripts/seed-demo-org.ts`

---

## 16. Roadmap

### Must-ship for v1
- [ ] Feature gating audit (confirm plan limits enforced in API routes)
- [ ] Org deletion (self-serve + GDPR compliance)
- [ ] Analytics page (Community+ — at minimum member count chart)

### v1.1
- [ ] Invoice / receipt download for org admins
- [ ] Custom domain DNS validation (confirm CNAME resolves before marking done)
- [ ] Bulk member CSV invite
- [ ] TIPA legacy field cleanup

### v2
- [ ] Digest email sending (weekly/monthly member activity summary)
- [ ] Advanced analytics (engagement, retention, churn)
- [ ] Org-to-org discovery / directory on marketing site
- [ ] Mobile app (API foundation already in place)
- [ ] PayPal as alternative for platform billing (currently Stripe-only)

---

## 17. Key File Reference

```
app/
  (org)/              # Org-tenant pages
    discussions/      # Discussions list + thread detail
    events/           # Events with RSVP
    resources/        # Announcements
    members/          # Member directory
    membership/       # Membership status + payment
    admin/            # Admin panel
  platform/           # Platform pages
    dashboard/        # Org list + setup checklist + trial status
    dashboard/[orgId]/billing/  # Plan selector + Stripe Connect
    signup/           # New org creation flow
    login/            # Platform login
  marketing/          # Marketing site (landing page)
  auth/callback/      # OAuth callback (any domain)
  api/
    admin/            # Admin-only actions
    auth/             # login, signup, OAuth, change-password
    events/           # Events CRUD + RSVP
    threads/          # Discussions CRUD
    resources/        # Announcements CRUD
    profile/          # Member profile CRUD
    stripe/           # Stripe webhooks + checkout (member dues)
    platform/         # Platform-level API (org creation, plan upgrade)
    org/config/       # Public org config (features, branding, labels)

lib/
  auth.ts             # requireAuth, requireAdmin, isOrgPublic
  org.ts              # Domain routing helpers, ROOT_DOMAIN
  settings.ts         # Feature flags, org identity, plan resolution
  plans.ts            # Plan definitions (single source of truth)
  resend.ts           # Email sending
  stripe.ts           # Stripe instances (org + platform)
  subscription-sync.ts # Stripe → org_memberships sync

components/
  Navbar.tsx          # Main nav (org-branded, dynamic labels, guest mode)
  GuestBanner.tsx     # Banner for unauthenticated visitors on public orgs
  platform/           # Platform-specific components

proxy.ts              # Next.js middleware: domain routing
types/database.ts     # All TypeScript types for DB rows
supabase/migrations/  # SQL migrations
scripts/
  seed-demo-org.ts    # Seed Lakeside Sports Club demo org
```
