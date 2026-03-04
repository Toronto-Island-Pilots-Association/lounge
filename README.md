# Membership App

[![Tests](https://github.com/YOUR_USERNAME/tipa/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/tipa/actions/workflows/test.yml)

A feature-rich membership management application for non-profit organizations built with Next.js, Supabase, Stripe, and Resend.

## Features

- **Two Membership Levels**: Free and Paid memberships
- **Stripe Integration**: Secure payment processing for paid memberships
- **Role-Based Access Control**: Member and Admin roles with appropriate permissions
- **Admin Dashboard**: Manage members and resources
- **Resources System**: Share resources with all members
- **Email Notifications**: Automated emails using Resend for welcome and membership upgrades

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database & Auth**: Supabase
- **Payments**: Stripe
- **Email**: Resend
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- A Stripe account (for payments)
- A Resend account (for emails)

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe (optional; for paid memberships)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API
4. Copy your service role key from Settings > API (keep this secret!)

### 4. Stripe Setup (optional)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create products and prices for your membership tiers
3. Configure the webhook to point to your `/api/stripe/webhook` endpoint
4. Add your Stripe keys to environment variables

### 5. Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your domain (or use the default sender for testing)
4. Update `RESEND_FROM_EMAIL` with your verified email

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Syncing prod data to lounge-dev (development only)

To copy data from the **lounge** (prod) database into **lounge-dev** for local/testing use:

1. **Requirements:** `pg_dump` and `psql` **version 17 or newer** (Supabase uses Postgres 17). Install with `brew install postgresql@17` and ensure `$(brew --prefix postgresql@17)/bin` is on your PATH, or the script will use it from the default Homebrew location if present.

2. **Env vars** (same `.env` / `.env.local` as the rest of the app; do not commit secrets):
   - `SUPABASE_PROD_DATABASE_URL` – direct Postgres URI for **lounge** (prod). Use the read-only `sync_reader_login` role; see SQL in repo for creating it.
   - `SUPABASE_DEV_DATABASE_URL` – direct Postgres URI for **lounge-dev** (same project as `NEXT_PUBLIC_SUPABASE_URL`). From Supabase Dashboard → lounge-dev → Settings → Database → Connection string (URI).

   Same format as other Supabase vars (URI string); these are the **database** connection strings for `pg_dump`/`psql`, not the API URL or anon/service role keys. If the password contains special characters (e.g. `)`, `@`, `#`), URL-encode them in the URI or the host will be parsed wrong: `)` → `%29`, `@` → `%40`, `#` → `%23`.

3. **Run the sync:**
   ```bash
   source .env.local && npm run db:sync
   ```
   Or: `export SUPABASE_PROD_DATABASE_URL=... SUPABASE_DEV_DATABASE_URL=... && npm run db:sync`

This dumps `public` and `auth` data from lounge, truncates lounge-dev, and restores. **Do not** set these URLs in production; this is for developer use only.

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── admin/        # Admin endpoints
│   │   └── resources/    # Resources endpoints
│   ├── admin/            # Admin dashboard page
│   ├── dashboard/        # Member dashboard
│   ├── login/            # Login page
│   ├── resources/        # Resources page
│   └── signup/           # Signup page
├── components/            # React components
│   ├── AdminDashboard.tsx
│   ├── Navbar.tsx
├── lib/                  # Utility functions
│   ├── auth.ts           # Authentication helpers
│   ├── resend.ts         # Email functions
│   └── supabase/         # Supabase clients
├── supabase/
│   └── schema.sql        # Database schema
└── types/
    └── database.ts        # TypeScript types
```

## Key Features Explained

### Authentication

- Users can sign up and log in
- Automatic profile creation on signup
- Session management via Supabase Auth
- Protected routes with middleware

### Membership Levels

- **Free**: Default membership level for all new users
- **Paid**: Upgraded membership with Stripe subscription
- Membership expiration tracking
- Automatic downgrade on subscription cancellation

### Admin Features

- View all members
- Update member information (name, role, membership level)
- Create, edit, and delete resources
- Full CRUD operations on resources

### Resources

- All authenticated members can view resources
- Resources can be links, documents, videos, or other types
- Admin-only creation and management

### Email Notifications

- Welcome email on signup
- Membership upgrade confirmation
- Extensible for additional notifications

## Database Schema

The app uses two main tables:

- **user_profiles**: Stores user information, roles, and membership details
- **resources**: Stores resources available to all members

See `supabase/schema.sql` for the complete schema with RLS policies.

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure API routes with authentication checks
- Environment variables for sensitive data

## Deployment

1. Deploy to Vercel, Netlify, or your preferred platform
2. Set environment variables in your hosting platform
3. Update `NEXT_PUBLIC_APP_URL` with your production URL
4. Configure Stripe webhooks to point to your production URL
5. Run database migrations in Supabase

## Future Enhancements

- Email verification flow
- Password reset functionality
- Member profile editing
- Advanced resource filtering and search
- Member directory
- Event management
- Newsletter system

## License

MIT
