export type ArticleSection = {
  heading?: string
  body: string
}

export type Article = {
  slug: string
  title: string
  description: string
  category: 'Getting Started' | 'Migration' | 'Features' | 'Billing & Plans'
  sections: ArticleSection[]
}

export const ARTICLES: Article[] = [
  {
    slug: 'getting-started',
    title: 'Getting started with Club Lounge',
    description: 'How to create your lounge, invite your first members, and go live in under an hour.',
    category: 'Getting Started',
    sections: [
      {
        heading: 'Create your lounge',
        body: 'Sign up at clublounge.app/platform/signup. Choose a subdomain (e.g. ottawacycling.clublounge.app) — this is your club\'s permanent address. You\'ll be on a 14-day free trial of the Community plan automatically, no credit card required.',
      },
      {
        heading: 'Configure your club identity',
        body: 'From your platform dashboard, go to Settings → General. Set your club\'s display name, description, contact email, and accent colour. Upload a logo — it appears in the navbar and on member-facing pages. You can also upload a favicon so your lounge has its own browser tab icon.',
      },
      {
        heading: 'Set up membership levels',
        body: 'Go to Settings → Membership to define your tiers (e.g. Full Member, Associate, Student, Honorary). Each tier can have a different monthly or annual dues amount. Honorary members are never charged. You can enable or disable tiers at any time.',
      },
      {
        heading: 'Customise the signup form',
        body: 'Settings → Signup form controls what information you collect from applicants. Toggle built-in sections (phone, mailing address, statement of interest) on or off, mark them required, and add fully custom fields — text, dropdowns, checkboxes, dates, and more.',
      },
      {
        heading: 'Invite your first members',
        body: 'Share your lounge URL directly, or use the member invite feature (Community plan and above) to send email invitations. New signups land in a pending queue — review and approve them from the Members section of your admin panel. You can also turn off approval if you want open registration.',
      },
      {
        heading: 'Go live',
        body: 'Your lounge is live from day one. Members can access it at your subdomain immediately. When you\'re ready, connect a custom domain under Settings → Integrations (Starter plan and above).',
      },
    ],
  },
  {
    slug: 'migrating-from-wild-apricot',
    title: 'Migrating from Wild Apricot',
    description: 'We migrate your member data for free. Here\'s what we move, how long it takes, and what to do on day one.',
    category: 'Migration',
    sections: [
      {
        heading: 'What we migrate',
        body: 'We import your full member list including names, email addresses, phone numbers, mailing addresses, membership levels, and join dates. Contact history and event attendance records are not migrated — Club Lounge starts fresh from the day you go live.',
      },
      {
        heading: 'Timeline',
        body: 'Migration is typically completed within 48 hours of you signing up and sending us your Wild Apricot export. Most clubs are fully live within the same week they decide to switch.',
      },
      {
        heading: 'How to get started',
        body: 'Sign up for Club Lounge, then email hello@clublounge.app with the subject "Wild Apricot migration". Attach a CSV export of your member list from Wild Apricot (Members → Export). We\'ll handle the import and notify you when your members are loaded.',
      },
      {
        heading: 'What members experience',
        body: 'Imported members receive a welcome email with a link to set their password and complete their profile. They don\'t need to re-enter their basic info — it\'s already there. The whole handoff takes under 5 minutes for each member.',
      },
      {
        heading: 'Dues and payments',
        body: 'Existing Wild Apricot payment records are not transferred. If you collect dues through Club Lounge (Starter plan and above), members will set up a new payment method the first time dues are collected. Annual dues cycles can be configured to align with your existing renewal dates.',
      },
      {
        heading: 'After migration',
        body: 'We recommend keeping your Wild Apricot account active (but paused) for one billing cycle so you have a fallback. After 30 days, most clubs cancel their Wild Apricot subscription without issue.',
      },
    ],
  },
  {
    slug: 'dues-and-payments',
    title: 'Dues collection and payments',
    description: 'How Stripe Connect works, how to set dues amounts, and how members pay.',
    category: 'Features',
    sections: [
      {
        heading: 'How it works',
        body: 'Club Lounge uses Stripe Connect Express. Your club gets its own Stripe account connected through Club Lounge — money goes directly to your bank account, never through us. Club Lounge does not take a percentage of your dues.',
      },
      {
        heading: 'Setting up payments',
        body: 'Go to Settings → Integrations and click "Connect with Stripe". You\'ll be guided through Stripe\'s onboarding — this takes about 5 minutes and requires your club\'s bank details and a representative\'s identity verification. Once approved, you can set dues amounts per membership tier.',
      },
      {
        heading: 'Dues amounts',
        body: 'Set a monthly or annual amount for each membership tier under Settings → Membership. Honorary members are never charged regardless of the amount set. You can offer both monthly and annual options, and optionally give a discount for annual payment.',
      },
      {
        heading: 'Member payment experience',
        body: 'Members pay directly on their profile page using a credit or debit card. Payments are processed by Stripe and renewed automatically. Members receive a receipt by email. They can update their payment method at any time from their account settings.',
      },
      {
        heading: 'Tracking payments',
        body: 'Your admin dashboard shows who has paid, when their next renewal is, and flags anyone whose payment has failed. You can manually mark a member as paid (e.g. for cheque payments) or waive dues for specific members.',
      },
      {
        heading: 'Stripe fees',
        body: 'Stripe charges their standard processing fee (typically 2.9% + 30¢ per transaction in Canada/US). You can choose to absorb this or pass it on to members. Club Lounge does not add any additional transaction fees on top of Stripe\'s.',
      },
    ],
  },
  {
    slug: 'custom-domain',
    title: 'Setting up a custom domain',
    description: 'Point your own domain (e.g. lounge.yourclub.com) at your Club Lounge — available on Starter plan and above.',
    category: 'Features',
    sections: [
      {
        heading: 'Requirements',
        body: 'Custom domains are available on the Starter plan and above. You\'ll need access to your domain\'s DNS settings (typically through your registrar — GoDaddy, Namecheap, Google Domains, Cloudflare, etc.).',
      },
      {
        heading: 'Enter your domain',
        body: 'In your platform dashboard, go to Settings → Integrations. Enter your custom domain in the "Custom domain" field and click Save. We recommend using a subdomain like lounge.yourclub.com rather than a bare apex domain (yourclub.com) — subdomains are easier to configure and more reliable.',
      },
      {
        heading: 'Add a DNS record',
        body: 'After saving your domain, you\'ll see the required DNS record. Add a CNAME record pointing your subdomain to cname.clublounge.app. For example: lounge.yourclub.com → CNAME → cname.clublounge.app. DNS changes can take anywhere from a few minutes to 48 hours to propagate globally, though most resolve within an hour.',
      },
      {
        heading: 'Verify the domain',
        body: 'Once DNS has propagated, click "Check DNS" in Settings → Integrations. When verification passes, your lounge immediately becomes accessible at your custom domain. SSL is provisioned automatically — no certificates to manage.',
      },
      {
        heading: 'After verification',
        body: 'Your custom domain becomes the canonical URL for your lounge. All invite emails and links will use the new domain. Your old subdomain (yourclub.clublounge.app) continues to work and redirects to your custom domain.',
      },
    ],
  },
  {
    slug: 'member-management',
    title: 'Managing members',
    description: 'Approvals, roles, membership tiers, and how to handle inactive or lapsed members.',
    category: 'Features',
    sections: [
      {
        heading: 'Approval flow',
        body: 'By default, new signups are placed in a pending queue and must be approved by an admin before they can access the lounge. You can review pending members from your admin dashboard — approve, reject, or request more information. If you prefer open access, you can disable approval under Settings → Features.',
      },
      {
        heading: 'Member roles',
        body: 'Every member is either a standard Member or an Admin. Admins can approve members, manage settings, post announcements, and access the admin dashboard. Standard members can read and post in discussions, RSVP to events, view the member directory, and manage their own profile. There is no limit on admin seats on Community plan and above.',
      },
      {
        heading: 'Membership tiers',
        body: 'Tiers (e.g. Full, Associate, Student, Honorary) are defined under Settings → Membership. Each member is assigned a tier at signup or by an admin. Tiers control dues amounts and can be used to differentiate access in the future. Honorary members are never charged dues regardless of tier settings.',
      },
      {
        heading: 'Editing member profiles',
        body: 'Admins can edit any member\'s profile from the Members section of the admin panel — update their tier, contact details, custom field values, or membership status. Members can also edit their own profile at any time.',
      },
      {
        heading: 'Suspending or removing members',
        body: 'To remove a member, find them in the Members list and use the Remove option. Removed members lose access immediately. Their profile data is retained for 30 days in case of error, then permanently deleted. You can also suspend a member (blocking access without deleting their record) if you need to investigate before making a final decision.',
      },
      {
        heading: 'Lapsed members',
        body: 'If dues collection is enabled and a member\'s payment fails after retries, their status is automatically set to lapsed. Lapsed members can still log in and update their payment method, but cannot access member-only content until their dues are current. Admins can manually override this.',
      },
    ],
  },
]

export const CATEGORIES = ['Getting Started', 'Migration', 'Features', 'Billing & Plans'] as const
export type ArticleCategory = typeof CATEGORIES[number]
