# ClubLounge — Product & Technical Reference

**Last updated:** March 2026
**Branch:** `feature/multi-tenancy` (pre-launch)

---

## 1. What This Is

ClubLounge is a **multi-tenant membership management SaaS** for small and mid-size clubs and associations. Each club ("org") gets a branded subdomain (`[slug].clublounge.app`) or a custom domain. Members sign up, pay dues, read announcements, attend events, and talk to each other — all under the club's own brand.

The **platform layer** (`platform.clublounge.app`) is where club admins create orgs, manage billing, and connect Stripe for dues collection.

**Origin:** Built on top of the TIPA (Toronto Island Pilots Association) single-tenant app. TIPA runs as the `tipa` org and retains aviation-specific fields. Once multi-tenancy is stable, TIPA migrates and legacy complexity is removed.

---

## 2. Users

| User | Description |
|------|-------------|
| **Club Admin** | Creates the org, configures it, approves/invites members, posts content. Accesses `/admin` within their org. Has a "Platform" nav link back to the dashboard. |
| **Club Member** | Signs up via `/become-a-member` or is invited. After approval + payment they access discussions, events, announcements, directory. |
| **Guest** | Browses public orgs in read-only mode. Sees `GuestBanner`. Write actions hidden. |
| **Platform Super-Admin** | Internal only — not yet formally implemented. Managed via direct Supabase access. |

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Payments — member dues | Stripe Connect (per-org Express accounts) |
| Payments — platform billing | Stripe (platform account, separate from Connect) |
| Email | Resend (`lib/resend.ts`) |
| Hosting | Vercel — wildcard `*.clublounge.app` DNS covers all org subdomains |
| File storage | Supabase Storage — buckets: `events`, `resources`, `profile-pictures` |

---

## 4. Domain Routing

Handled in `proxy.ts` (Next.js middleware):

| Domain | Type | Renders |
|--------|------|---------|
| `clublounge.app` | `marketing` | `/marketing/*` (rewritten) |
| `platform.clublounge.app` | `platform` | `/platform/*` (rewritten) |
| `[slug].clublounge.app` or custom domain | `org` | `/` (unchanged) |

Middleware sets request headers for downstream use:
- `x-domain-type` — `marketing`, `platform`, or `org`
- `x-org-id` — UUID of the org (only on org domains)
- `x-org-slug` — slug of the org

**Reading org context in API routes:**
```typescript
import { headers } from 'next/headers'
const h = await headers()
const orgId = h.get('x-org-id') // null on platform/marketing domains
```

**In server components / lib/auth.ts:** `getOrgId()` does the same.

**Local dev:** `?__domain=tipa` (or any slug) simulates a subdomain.

---

## 5. Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `organizations` | One row per org. `slug`, `plan`, `trial_ends_at`, `stripe_account_id`, `stripe_onboarding_complete`, `custom_domain`. |
| `user_profiles` | Global identity — one per user across all orgs. `user_id`, `email`, `full_name`, `first_name`, `last_name`, `phone`, `street`, `city`, `province_state`, `postal_zip_code`, `country`, `profile_picture_url`, `notify_replies`. |
| `org_memberships` | Per-org membership — one per (user, org). `role` (member\|admin), `status` (pending\|approved\|rejected\|expired), `membership_level`, `member_number`, `membership_expires_at`, `stripe_subscription_id`, `stripe_customer_id`, `paypal_subscription_id`, `custom_data`. TIPA legacy: `pilot_license_type`, `aircraft_type`, `call_sign`, etc. |
| `member_profiles` | **VIEW** — JOIN of `org_memberships` + `user_profiles`. Primary read target. |
| `settings` | Key-value per org. Feature flags, labels, email templates, membership config, identity. |
| `threads` | Discussion posts. |
| `comments` | Replies to threads. |
| `reactions` | Emoji reactions on threads/comments. |
| `events` | Calendar events with optional image and location. |
| `event_rsvps` | RSVP records per event. |
| `resources` | Announcements / documents with optional file and image. |
| `notifications` | In-app notifications per member. |
| `payments` | Payment records for member dues. |

### TypeScript types (`types/database.ts`)
```typescript
UserProfile          // identity only
OrgMembership        // membership only
MemberProfile = OrgMembership & Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
// Use MemberProfile everywhere a full member record is needed
```

### Multi-tenancy rule
**Every query against a tenant table must be filtered by `org_id`. No exceptions.**

Tenant tables: `org_memberships`, `member_profiles`, `threads`, `comments`, `reactions`, `events`, `event_rsvps`, `resources`, `notifications`, `payments`, `settings`.

`user_profiles` is global (no `org_id`) — one row per user across all orgs.

```typescript
// Pattern for new API routes:
const user = await requireAuth() // already org-scoped
const { data } = await supabase
  .from('member_profiles')
  .select('*')
  .eq('org_id', user.profile.org_id) // always filter!
```

### TIPA org ID
```typescript
import { TIPA_ORG_ID } from '@/types/database'
// 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
```

---

## 6. Auth & Session

**`lib/auth.ts`** — primary auth layer, all functions are org-scoped via `x-org-id` header:

| Function | Behaviour |
|----------|-----------|
| `getCurrentUser()` | Returns `{ ...user, profile: MemberProfile }` or null. Blocks non-approved (unless admin). |
| `getCurrentUserIncludingPending()` | Same but allows pending — used during onboarding. |
| `requireAuth()` | Throws `'Unauthorized'` if not logged in or not approved. |
| `requireAuthIncludingPending()` | Throws if not logged in. Allows pending. |
| `requireAdmin()` | Throws `'Forbidden: Admin access required'` if not admin. |
| `isOrgPublic()` | Returns true if `settings.public_access = 'true'` for the org. |
| `shouldRequireProfileCompletion(profile)` | True if address/name fields missing. |
| `shouldRequirePayment(profile)` | True if unpaid, not Honorary, and not admin. Admins always return false. |

**Cookies** set on root domain (`.clublounge.app`) — shared across all subdomains.

**Google OAuth** is centralised on the platform domain:
1. User clicks Google Sign-In on `[org].clublounge.app/login`
2. Redirects to `platform.clublounge.app/api/auth/oauth?provider=google&next=[org-url]`
3. Platform redirects to Google with `redirectTo=platform.../auth/callback?next=...`
4. Google returns to platform callback
5. Callback exchanges code, sets root-domain cookie, redirects to `next`
6. Org subdomain reads cookie from root domain — session available

PKCE verifier and code exchange both happen on platform domain — no mismatch.

---

## 7. Member Lifecycle

```
signup → pending → admin approves → approved
                                    ↓
                             (dues paid if required)
                                    ↓
                                active member
                                    ↓
                         (subscription expires) → expired
```

**Self-signup:**
1. User completes `/become-a-member` or signs up with Google
2. `status = 'pending'` created
3. Admin approves from `/admin/members`
4. `member_number` auto-assigned on approval (DB trigger)
5. If dues required, member pays via Stripe or PayPal

**Admin-invited:**
1. Admin invites via `/admin/members` — account with temp password
2. Member receives email with temp password
3. Member logs in → `requiresPasswordChange: true`
4. Member changes password → `status = 'approved'`

**Org creation:**
1. Admin signs up at `platform.clublounge.app/signup`
2. Org created on `hobby` plan with 14-day free trial (Starter features)
3. Platform dashboard shows setup checklist until complete:
   - ✅ Create your lounge
   - ⬜ Connect Stripe to collect dues
   - ⬜ Customize your club (logo / display name)
   - ⬜ Add your first member

---

## 8. Plans & Pricing

| Plan | Price | Members | Features added |
|------|-------|---------|----------------|
| **Hobby** | $5/mo | Up to 20 | Discussions, Events, Announcements, Member directory |
| **Starter** | $49/mo | Unlimited | + Stripe dues, custom domain, remove branding, member invitations |
| **Community** | $99/mo | Unlimited | + Digest emails, analytics |
| **Club Pro** | $199/mo | Unlimited | + Membership tiers |

All new orgs get a **14-day free trial at Starter level**. No credit card required.

**Plan resolution logic** (`lib/settings.ts → getOrgPlan()`):
- Reads `organizations.plan` and `organizations.trial_ends_at`
- If plan is `hobby` and trial is still active → returns `'starter'`
- Otherwise returns the stored plan

**Plan definitions** are the single source of truth: `lib/plans.ts`

---

## 9. Feature Flags

Stored in the `settings` table per org. Each flag is gated by both the org's plan ceiling and the admin's manual toggle. Managed at **Admin → Settings → Features**.

| Settings key | What it controls |
|-------------|-----------------|
| `feature_discussions` | Discussion board |
| `feature_events` | Events + RSVP |
| `feature_resources` | Announcements / documents |
| `feature_member_directory` | Member directory page |
| `require_member_approval` | New signups need admin approval |
| `allow_member_invitations` | Members can invite others |
| `discussions_label` | Nav label (default "Discussions"; TIPA = "Hangar Talk") |
| `events_label` | Nav label (default "Events") |
| `resources_label` | Nav label (default "Announcements") |
| `public_access` | `'true'` enables guest read-only mode |

---

## 10. Public / Guest Mode

Set `public_access = 'true'` in the org's `settings` table to make it publicly readable.

- Unauthenticated visitors see discussions, events, resources, members in read-only
- `GuestBanner` component shows with links to sign in / apply
- Write actions (post, RSVP, react, comment) hidden
- API routes use service role client + org ID from headers
- `/api/profile` returns `{ isGuest: true }` (200) instead of 401

---

## 11. Email

Handled by Resend via `lib/resend.ts`. Templates customisable per org at **Admin → Settings → Emails**.

| Trigger | When sent |
|---------|-----------|
| Welcome / approval | Member approved by admin |
| Membership expiry reminder | 3 automated nudges before expiry |
| Pending member nudge | Remind pending members to complete signup |
| Event notification | When admin creates a new event |
| Introduce yourself | Prompt to new member on approval |

---

## 12. Payments

### Member dues (Stripe Connect)
- Each org connects their own Stripe Express account via **Admin → Settings → Integrations**
- Dues flow through the org's account; platform takes no cut currently
- Webhooks at `/api/stripe/webhook` sync to `org_memberships`
- `membership_expires_at` set from subscription period end
- `lib/subscription-sync.ts` — `syncSubscriptionStatus()` keeps status current
- PayPal also supported (legacy TIPA integration)

### Platform billing (org subscriptions)
- Separate Stripe account from org Stripe Connect
- Plan upgrades/downgrades: `POST /api/platform/orgs/[orgId]/plan/upgrade`
- Webhooks at `/api/platform/stripe/webhook` sync plan to `organizations`
- Billing UI: `platform.clublounge.app/platform/dashboard/[orgId]/billing`

---

## 13. Admin Panel

Located at `/admin/*` within each org. `role = 'admin'` required.

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard: pending count, quick stats |
| `/admin/members` | Approve, invite, manage, export members |
| `/admin/events` | Create and manage events |
| `/admin/resources` | Post and manage announcements |
| `/admin/payments` | View payment history |
| `/admin/analytics` | Member growth, engagement (Community+ plan) |
| `/admin/settings` | Full org config |

**Settings tabs:** Club · Features · Membership · Signup · Emails · Integrations

---

## 14. Key File Reference

```
proxy.ts                        # Middleware: domain routing, org context headers
types/database.ts               # All TypeScript types for DB rows

lib/
  auth.ts                       # requireAuth, requireAdmin, isOrgPublic, getCurrentUser
  org.ts                        # getDomainType, buildOrgUrl, ROOT_DOMAIN
  settings.ts                   # Feature flags, org identity, plan resolution (getOrgPlan)
  plans.ts                      # Plan definitions — single source of truth
  resend.ts                     # Email sending
  stripe.ts                     # Stripe instances (org Connect + platform)
  subscription-sync.ts          # Stripe → org_memberships sync
  supabase/server.ts            # createClient (server, cookie handling)
  supabase/client.ts            # createClient (browser)

app/
  (org)/
    discussions/                # Discussion board
    events/                     # Events + RSVP
    resources/                  # Announcements
    members/                    # Member directory
    membership/                 # Membership status + payment
    admin/                      # Admin panel (members, events, resources, settings…)
  platform/
    dashboard/                  # Org list, setup checklist, trial badge
    dashboard/[orgId]/billing/  # Plan selector + Stripe Connect status
    signup/                     # New org creation flow
    login/                      # Platform login
  marketing/                    # Landing page (ClubLoungeLanding component)
  auth/callback/                # OAuth callback (runs on any domain)
  api/
    admin/                      # Admin-only actions (invite, approve, bulk…)
    auth/                       # login, signup, OAuth, change-password
    events/                     # Events CRUD + RSVP
    threads/                    # Discussions CRUD
    resources/                  # Announcements CRUD
    profile/                    # Member profile CRUD
    stripe/                     # Stripe webhooks + checkout (member dues)
    platform/                   # Platform API (org creation, plan upgrade)
    org/config/                 # Public org config (features, branding, labels)

components/
  Navbar.tsx                    # Main nav — org-branded, dynamic labels, guest mode
  GuestBanner.tsx               # Banner for unauthenticated visitors on public orgs
  platform/                     # Platform-specific components
  club-lounge/ClubLoungeLanding # Marketing landing page component

scripts/
  seed-demo-org.ts              # Seeds "Lakeside Sports Club" demo org

supabase/migrations/            # SQL migrations (run against clublounge-dev for new work)
docs/PRD.md                     # This file
```

---

## 15. Environments & Infrastructure

### Supabase projects

| Project | Purpose |
|---------|---------|
| `lounge` | **Production — never touch directly** |
| `lounge-dev` | Dev DB for TIPA |
| `clublounge-dev` (ref: `hibzyotkqxqalxusizwz`) | Multi-tenant dev — currently active |

Switch: `supabase link --project-ref hibzyotkqxqalxusizwz`
Apply migrations: `supabase db push`

### Key environment variables

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_ROOT_DOMAIN` | `clublounge.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — bypasses RLS |
| `STRIPE_SECRET_KEY` | Org Stripe Connect |
| `STRIPE_PLATFORM_SECRET_KEY` | Platform billing Stripe |
| `STRIPE_PLATFORM_WEBHOOK_SECRET` | Platform webhook validation |
| `RESEND_API_KEY` | Email sending |
| `VERCEL_API_TOKEN` | Custom domain registration |

### Demo org

| | |
|-|-|
| URL | `demo.clublounge.app` |
| Name | Lakeside Sports Club |
| Purpose | Public sales demo — no login required |
| Admin login | `admin@demo.clublounge.app` / `DemoAdmin2024!` |
| Seed script | `npx tsx --env-file=.env scripts/seed-demo-org.ts` |

---

## 16. Current State

### Built and working ✅
- Multi-tenant architecture: domain routing, org isolation, header-based auth
- Platform dashboard: org creation, trial countdown, setup checklist
- 14-day free trial (Starter features) for all new orgs
- Full admin panel: members, events, resources, payments, analytics, settings
- Member lifecycle: signup → pending → approved → subscribed → expired
- Discussions with categories, comments, reactions
- Events with RSVP and Google Calendar export
- Announcements / resources with file attachments
- Member directory
- Public / guest read-only mode
- Configurable nav section labels per org
- Email flows: welcome, approval, expiry reminders, event notifications
- Google OAuth centralised on platform domain
- Mobile API support (Bearer token auth)
- Stripe Connect for member dues + platform Stripe for org billing
- Plan-based feature gating

### Known gaps 🟡
- **Feature gating audit** — plan flags defined; not confirmed enforced in all API routes
- **Analytics** — `/admin/analytics` placeholder, not fully built
- **Digest emails** — in plan definitions but sending logic not confirmed
- **Org deletion** — no self-serve delete
- **Invoice / receipt download** — payment records exist, no admin UI
- **Custom domain DNS validation** — no automatic verification after CNAME added
- **Bulk CSV member invite** — single invite works; bulk not built

### TIPA legacy to clean up post-launch 🔴
- Aviation fields on `org_memberships` (`pilot_license_type`, `aircraft_type`, `call_sign`, etc.) — new orgs use `custom_data`
- `appendMemberToSheet()` Google Sheets — TIPA-only
- Fixed Sept 1 trial expiry in `change-password` — TIPA-specific, needs org config
- `isTipa` flag checks in auth callback

---

## 17. Roadmap

### Must-ship for v1
- [ ] Feature gating audit (confirm plan limits enforced in all API routes)
- [ ] Org deletion (admin self-serve + GDPR)
- [ ] Analytics page (at minimum: member count over time chart)

### v1.1
- [ ] Invoice / receipt download for org admins
- [ ] Custom domain DNS auto-validation
- [ ] Bulk member CSV import
- [ ] TIPA legacy field cleanup

### v2
- [ ] Digest emails (weekly/monthly member activity)
- [ ] Advanced analytics (engagement, retention, churn)
- [ ] Org discovery directory on marketing site
- [ ] Mobile app (API layer already in place)
- [ ] PayPal for platform billing (currently Stripe-only)
