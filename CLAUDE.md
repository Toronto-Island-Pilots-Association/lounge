# ClubLounge — Codebase Guide

## What this is

A **multi-tenant membership platform**. Organisation admins create an org, invite members, members apply and subscribe, then access gated features (discussions, events, resources, etc.).

Built on top of the original **TIPA** (Toronto Island Pilots Association) single-tenant app. Multi-tenancy is being layered in. TIPA runs as the `tipa` org and has legacy fields (aviation-specific: pilot_license_type, aircraft_type, call_sign, etc.). Once the multi-tenant architecture is stable, TIPA will be migrated and the legacy complexity removed.

---

## Domain routing

Three domain types, handled in `proxy.ts`:

| Domain | Type | Renders |
|--------|------|---------|
| `clublounge.app` | `marketing` | `/marketing/*` (rewritten) |
| `platform.clublounge.app` | `platform` | `/platform/*` (rewritten) |
| `[slug].clublounge.app` or custom domain | `org` | `/` (unchanged) |

The middleware sets these request headers for downstream use:
- `x-domain-type` — `marketing`, `platform`, or `org`
- `x-org-id` — UUID of the org (only on `org` domains)
- `x-org-slug` — slug of the org

**In API routes**, read org context via `headers()` from `next/headers`:
```typescript
import { headers } from 'next/headers'
const h = await headers()
const orgId = h.get('x-org-id') // null on platform/marketing domains
```

**In server components / lib/auth.ts**, `getOrgId()` does the same thing.

Local dev: use `?__domain=tipa` (or any slug) to simulate a subdomain.

---

## Database schema

### Tables

**`user_profiles`** — global identity, one row per user across all orgs
- `user_id`, `email`, `full_name`, `first_name`, `last_name`, `phone`
- `street`, `city`, `province_state`, `postal_zip_code`, `country`
- `profile_picture_url`, `notify_replies`

**`org_memberships`** — per-org membership, one row per (user, org)
- `user_id`, `org_id`, `role` (member|admin), `status` (pending|approved|rejected|expired)
- `membership_level`, `membership_class`, `member_number`, `membership_expires_at`
- `stripe_subscription_id`, `stripe_customer_id`, `paypal_subscription_id`
- `invited_at`, `last_reminder_sent_at`, `reminder_count`
- TIPA-specific: `pilot_license_type`, `aircraft_type`, `call_sign`, `how_often_fly_from_ytz`, `is_student_pilot`, `flight_school`, `instructor_name`
- Generic: `statement_of_interest`, `interests`, `how_did_you_hear`, `custom_data`

**`member_profiles`** — VIEW joining both tables. Use this for reads that need identity + membership together.

### TypeScript types (`types/database.ts`)
- `UserProfile` — identity only
- `OrgMembership` — membership only
- `MemberProfile = OrgMembership & Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>` — use this everywhere a full member record is needed

### TIPA org ID
```typescript
import { TIPA_ORG_ID } from '@/types/database'
// 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
```

---

## Auth & session

**`lib/auth.ts`** — the primary auth layer:
- `getCurrentUser()` — returns `{ ...user, profile: MemberProfile }` or null. Blocks non-approved users (unless admin).
- `getCurrentUserIncludingPending()` — same but allows pending users (used during onboarding).
- `requireAuth()` — throws `'Unauthorized'` if not logged in or not approved.
- `requireAuthIncludingPending()` — throws if not logged in (allows pending).
- `requireAdmin()` — throws `'Forbidden: Admin access required'` if not admin.
- `shouldRequireProfileCompletion(profile)` — true if address/name fields missing.
- `shouldRequirePayment(profile)` — true if membership unpaid and not Honorary.

All of these are org-scoped — they read `x-org-id` from headers and filter `member_profiles` by `org_id`. On the platform domain, `org_id` is null so no profile is returned (platform routes should not call these).

**Cookies** are set on the root domain (`.clublounge.app`) so sessions are shared across subdomains. This is required for the centralised OAuth flow.

---

## OAuth flow

Google OAuth is centralised on the platform domain to avoid registering every org subdomain in Supabase's allowed URL list:

1. User clicks "Sign in with Google" on `tipa.clublounge.app/login`
2. Browser navigates to `platform.clublounge.app/api/auth/oauth?provider=google&next=https://tipa.clublounge.app/discussions`
3. Platform domain redirects to Google with `redirectTo=platform.clublounge.app/auth/callback?next=...`
4. Google returns to `platform.clublounge.app/auth/callback`
5. Callback exchanges code, sets root-domain cookie, then redirects to `next` (the org URL)
6. Org subdomain reads the cookie from root domain — session is available

PKCE verifier is stored on platform domain; code is also exchanged on platform domain — no mismatch.

---

## Member lifecycle

```
signup → pending → (admin approves OR auto-approved) → approved
                                                      ↓
                                               (subscription expires) → expired
```

**Invited members** (admin invites):
1. Admin creates account via `/api/admin/invite-member` — status `pending`
2. Member receives email with temp password
3. Member logs in → `requiresPasswordChange: true` returned
4. Member changes password → `/api/auth/change-password` sets status to `approved`

**Self-signup** (Google OAuth or form):
1. User completes `/become-a-member` form or signs up with Google
2. Profile created with status `pending`
3. Admin approves from admin panel
4. On approval, `member_number` is auto-assigned (DB trigger)

**Payment** (Stripe or PayPal):
- Stripe webhooks handled in `/api/stripe/webhook` — updates `org_memberships`
- `membership_expires_at` set from subscription period end
- `syncSubscriptionStatus` / `syncSubscriptionBySubscriptionId` in `lib/subscription-sync.ts` keep status in sync

---

## Multi-tenancy rules

Every query against a tenant table **must** be filtered by `org_id`. No exceptions.

Tenant tables: `org_memberships`, `member_profiles`, `threads`, `comments`, `reactions`, `events`, `event_rsvps`, `resources`, `notifications`, `payments`, `settings`.

`user_profiles` is global (no `org_id`) — one row per user, used for identity only.

When writing new API routes:
```typescript
const user = await requireAuth() // already org-scoped
// user.profile.org_id is the org for this request
const { data } = await supabase
  .from('member_profiles')
  .select('*')
  .eq('org_id', user.profile.org_id)  // always filter!
```

---

## Supabase environments

| Project | Purpose |
|---------|---------|
| `lounge` | **Production — never touch directly** |
| `lounge-dev` | Dev DB for TIPA (currently linked by default) |
| `clublounge-dev` | Multi-tenant dev (ref: `hibzyotkqxqalxusizwz`) |

To switch to clublounge-dev: `supabase link --project-ref hibzyotkqxqalxusizwz`

---

## Key directories

```
app/
  (org)/              # Org-tenant pages: discussions, events, profile, admin, etc.
  platform/           # Platform pages: dashboard, org settings, signup
  marketing/          # Marketing site
  auth/callback/      # OAuth callback (runs on any domain)
  api/
    admin/            # Admin-only actions (invite, approve, etc.)
    auth/             # login, signup, change-password, oauth
    profile/          # Member profile CRUD
    stripe/           # Stripe webhooks + checkout
    platform/         # Platform-level API (org creation, etc.)

lib/
  auth.ts             # requireAuth, requireAdmin, getCurrentUser
  org.ts              # getDomainType, getOrgByHostname, ROOT_DOMAIN
  supabase/
    server.ts         # createClient (server-side, with cookie handling)
    client.ts         # createClient (browser-side)
  resend.ts           # Email sending
  stripe.ts           # Stripe instance
  subscription-sync.ts# Sync Stripe → org_memberships status
  settings.ts         # Per-org settings (membership fees, trial config)
  google-sheets.ts    # TIPA: append new members to Google Sheet

proxy.ts              # Next.js middleware: domain routing, org context headers
types/database.ts     # All TypeScript types for DB rows
supabase/migrations/  # SQL migrations (run against clublounge-dev for new work)
```

---

## TIPA legacy notes

- TIPA-specific fields on `org_memberships` (pilot_license_type, aircraft_type, etc.) are kept as typed columns for now; new orgs should use `custom_data`
- `appendMemberToSheet()` in Google Sheets integration is TIPA-only
- Auth callback has TIPA-specific checks (`isTipa` flag) for profile completion redirect and aviation field validation
- `shouldRequireProfileCompletion()` checks address fields — this is generic and applies to all orgs
- Fixed trial expiry (Sept 1) logic in `change-password` is TIPA-specific — will need to become org-configurable
