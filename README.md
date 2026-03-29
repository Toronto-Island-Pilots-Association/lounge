# ClubLounge

ClubLounge is a multi-tenant membership platform for clubs and associations. Each club gets its own lounge on a subdomain like `yourclub.clublounge.app` or a custom domain, while admins manage setup, billing, and org-level settings from the platform host.

This repo is in the middle of the TIPA-to-multi-tenant transition. The codebase already supports:

- org-scoped member database
- membership levels and dues setup
- discussions, events, and announcements
- platform-managed org creation and billing
- Stripe Connect for club dues collection
- custom domains and branding

## Domains

The app runs in three modes:

- `clublounge.app` → marketing
- `platform.clublounge.app` → platform admin
- `[slug].clublounge.app` or custom domain → club lounge

Middleware in `proxy.ts` sets:

- `x-domain-type`
- `x-org-id`
- `x-org-slug`

Every tenant query must be scoped by `org_id`.

## Stack

- Next.js 16
- TypeScript
- Supabase Auth / Postgres / Storage
- Stripe
- Resend
- Tailwind CSS

## Local setup

### 1. Install

```bash
npm install
```

### 2. Configure env

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PLATFORM_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

RESEND_API_KEY=...
RESEND_FROM_EMAIL=...

NEXT_PUBLIC_APP_URL=http://clublounge.local:3000
NEXT_PUBLIC_ROOT_DOMAIN=clublounge.app
```

Depending on the flow you are testing, you may also need:

```env
VERCEL_PROJECT_ID=...
VERCEL_TEAM_ID=...
VERCEL_TOKEN=...
```

### 3. Start dev server

```bash
npm run dev
```

### 4. Simulate an org locally

Use the query param:

```txt
?__domain=tipa
```

That lets you test org-host behavior without real wildcard DNS in local dev.

## Plans

Defined in [`lib/plans.ts`](./lib/plans.ts).

Current plan labels:

- `Hobby`
- `Core`
- `Growth`
- `Pro`

Important rule:

- marketing, billing UI, and in-app feature gating must stay consistent with `lib/plans.ts`

## Onboarding flow

Current admin flow:

1. create lounge from platform
2. land on `/platform/dashboard/[orgId]/onboarding`
3. set membership levels / dues
4. choose a plan and add billing details
5. connect Stripe for dues when ready
6. invite members

Creating a lounge does not immediately charge the admin. Billing is added before operating actions like invites, announcements, events, or dues collection.

## Tests

Common commands:

```bash
npm run type-check
npm test -- --runInBand
npm run test:coverage
```

See [`TESTING.md`](./TESTING.md) for the current testing guide.

## Important docs

- [`CLAUDE.md`](./CLAUDE.md) → working rules for this repo
- [`docs/PRD.md`](./docs/PRD.md) → current product / architecture reference
- [`TESTING.md`](./TESTING.md) → how to run and write tests
- [`MOBILE_API_DOCS.md`](./MOBILE_API_DOCS.md) → legacy TIPA mobile notes, not the source of truth for ClubLounge platform behavior

## Current status

This is an actively evolving codebase. If you change:

- plans
- pricing
- onboarding
- org-vs-platform navigation
- Stripe flows

you need to update both the product behavior and the docs together.
