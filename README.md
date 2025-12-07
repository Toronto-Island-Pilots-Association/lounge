# Membership App

A feature-rich membership management application for non-profit organizations built with Next.js, Supabase, PayPal, and Resend.

## Features

- **Two Membership Levels**: Free and Paid memberships
- **PayPal Integration**: Secure payment processing for paid memberships
- **Role-Based Access Control**: Member and Admin roles with appropriate permissions
- **Admin Dashboard**: Manage members and resources
- **Resources System**: Share resources with all members
- **Email Notifications**: Automated emails using Resend for welcome and membership upgrades

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database & Auth**: Supabase
- **Payments**: PayPal
- **Email**: Resend
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- A PayPal developer account (for payments)
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

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox
PAYPAL_PLAN_ID=your_paypal_plan_id  # Optional: Set to use a specific subscription plan ID (takes priority over auto-generation)

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

### 4. PayPal Setup

1. Create a PayPal developer account at [developer.paypal.com](https://developer.paypal.com)
2. Create a new app and get your Client ID
3. Set up a subscription plan in PayPal (you'll need the Plan ID)
4. Update the `planId` in `app/dashboard/page.tsx` with your actual PayPal Plan ID

### 5. Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your domain (or use the default sender for testing)
4. Update `RESEND_FROM_EMAIL` with your verified email

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── admin/        # Admin endpoints
│   │   ├── paypal/       # PayPal integration
│   │   └── resources/    # Resources endpoints
│   ├── admin/            # Admin dashboard page
│   ├── dashboard/        # Member dashboard
│   ├── login/            # Login page
│   ├── resources/        # Resources page
│   └── signup/           # Signup page
├── components/            # React components
│   ├── AdminDashboard.tsx
│   ├── Navbar.tsx
│   └── PayPalButton.tsx
├── lib/                  # Utility functions
│   ├── auth.ts           # Authentication helpers
│   ├── paypal.ts         # PayPal configuration
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
- **Paid**: Upgraded membership with PayPal subscription
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

## PayPal Integration Notes

1. **Plan ID**: 
   - **Option 1 (Recommended)**: Set `PAYPAL_PLAN_ID` or `NEXT_PUBLIC_PAYPAL_PLAN_ID` in your environment variables
   - **Option 2**: The system can auto-generate a plan via PayPal API (requires proper API permissions)
   - **Option 3**: Manually create a plan in PayPal dashboard and set the Plan ID in environment variables
2. **Webhooks**: Configure PayPal webhooks to point to `/api/paypal/webhook` for subscription events
3. **Environment**: Use `sandbox` for testing, `production` for live
4. **Priority**: Environment variable → Database setting → Auto-generation

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
4. Configure PayPal webhooks to point to your production URL
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
