# ClubLounge — Codebase Guide

> Full product and technical reference: **`docs/PRD.md`**

---

## Critical rules

### Multi-tenancy — org_id is mandatory
Every query against a tenant table **must** be filtered by `org_id`. No exceptions.

Tenant tables: `org_memberships`, `member_profiles`, `threads`, `comments`, `reactions`, `events`, `event_rsvps`, `resources`, `notifications`, `payments`, `settings`.

```typescript
const user = await requireAuth() // already org-scoped
const { data } = await supabase
  .from('member_profiles')
  .select('*')
  .eq('org_id', user.profile.org_id) // always filter!
```

### Reading org context in API routes
```typescript
import { headers } from 'next/headers'
const h = await headers()
const orgId = h.get('x-org-id') // null on platform/marketing domains
```

### Auth functions (`lib/auth.ts`)
- `requireAuth()` — throws if not logged in or not approved
- `requireAdmin()` — throws if not admin
- `isOrgPublic()` — true if `settings.public_access = 'true'`
- `shouldRequirePayment(profile)` — false for admins and Honorary members
- Platform routes must NOT call these (org_id is null there)

### TypeScript types
```typescript
// Use MemberProfile everywhere a full member record is needed
MemberProfile = OrgMembership & Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
```

### Supabase clients
- `createClient()` — respects RLS, uses user session
- `createServiceRoleClient()` — bypasses RLS, use only when necessary (guest reads, admin ops)

### Next.js routing
- Middleware lives in `proxy.ts` only — Next.js 16 does not allow `middleware.ts` alongside `proxy.ts`. Never create or restore `middleware.ts`.

---

## Environments

| Project | Purpose |
|---------|---------|
| `lounge` | **Production — never touch directly** |
| `lounge-dev` | Dev DB for TIPA |
| `clublounge-dev` (ref: `hibzyotkqxqalxusizwz`) | Multi-tenant dev — currently active |

Switch: `supabase link --project-ref hibzyotkqxqalxusizwz`
Apply migrations: `supabase db push`
Local dev: `?__domain=tipa` simulates a subdomain.

---

## Key constants
```typescript
import { TIPA_ORG_ID } from '@/types/database'
// 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

import { ROOT_DOMAIN } from '@/lib/org'
// 'clublounge.app'
```

---

## Plans (`lib/plans.ts`)
Single source of truth for what each plan allows. `getOrgPlan()` in `lib/settings.ts` returns `'starter'` during an active 14-day trial.

- Marketing, pricing, and plan naming must match the actual app behavior.
- When changing plan labels, pricing copy, or feature availability, update all app-facing surfaces consistently instead of patching only the landing page.
- Do not market a feature or limit unless it matches the current product implementation or an explicitly custom/high-touch offering.

---

## TIPA legacy notes
- Aviation fields on `org_memberships` (`pilot_license_type`, `aircraft_type`, `call_sign`) — TIPA only; new orgs use `custom_data`
- `isTipa` flag checks in auth callback — TIPA-specific
- Fixed Sept 1 trial expiry in `change-password` — TIPA-specific
