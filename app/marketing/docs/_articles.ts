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
        body: 'Sign up at clublounge.app/platform/signup and choose your club name and subdomain (for example, ottawacycling.clublounge.app). That becomes your lounge\'s permanent address. New lounges start on Hobby at $5/month, then continue into guided onboarding to set membership fees, choose a plan, and add billing details before inviting members or collecting dues.',
      },
      {
        heading: 'Configure your club identity',
        body: 'From your platform dashboard, go to Settings → General. Set your club\'s display name, description, contact email, and accent colour. Upload a logo so it appears in the navbar and on member-facing pages. You can also upload a favicon so your lounge has its own browser tab icon.',
      },
      {
        heading: 'Set up membership levels',
        body: 'Go to Settings → Membership to define your tiers (for example, Full Member, Associate, Student, or Honorary). Each tier has its own annual fee, and you can enable or disable tiers at any time. On Growth and Pro, you can also add optional trial periods to membership levels.',
      },
      {
        heading: 'Customise the signup form',
        body: 'Settings → Signup form controls what information you collect from applicants. Toggle built-in sections (phone, mailing address, statement of interest) on or off, mark them required, and add fully custom fields — text, dropdowns, checkboxes, dates, and more.',
      },
      {
        heading: 'Invite your first members',
        body: 'Share your lounge URL directly, or use member invitations on Core and above to send email invites. New signups land in a pending queue. Review and approve them from the Members area in your lounge admin, or turn approval off under Settings → Features if you want open registration.',
      },
      {
        heading: 'Go live',
        body: 'Your lounge is live from day one at its ClubLounge subdomain. When you are ready to operate it, add billing details, connect Stripe under Settings → Membership to collect dues, and connect a custom domain under Settings → Integrations if you are on Growth or Pro.',
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
        body: 'Existing Wild Apricot payment records are not transferred. If you collect dues through Club Lounge, members will add a new card the first time they pay through Stripe. Before inviting members, recreate your membership levels and annual fees under Settings → Membership so your new setup is ready to go.',
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
        body: 'Club Lounge uses Stripe Connect Express. Your club connects its own Stripe account, members pay through Stripe, and payouts go to your club\'s connected bank account. Stripe processes the payment, and Club Lounge applies a 2% platform fee on dues payments.',
      },
      {
        heading: 'Setting up payments',
        body: 'Go to Settings → Membership and use the Member dues section to connect Stripe. Add billing details for your Club Lounge plan first, then complete Stripe\'s onboarding. It usually takes about 5 minutes and requires your club\'s bank details plus identity verification for a representative.',
      },
      {
        heading: 'Dues amounts',
        body: 'Set an annual amount for each membership tier under Settings → Membership. If a tier should be free, set its fee to $0. Growth and Pro clubs can also add trial periods to membership levels.',
      },
      {
        heading: 'Member payment experience',
        body: 'Members pay from the Membership page using a credit or debit card through Stripe Checkout. Membership renews annually unless it is cancelled. Members receive Stripe receipts by email and can update their payment method from Stripe\'s customer portal.',
      },
      {
        heading: 'Tracking payments',
        body: 'Your lounge admin shows payment history, renewal dates, and failed payments. If someone pays offline, admins can record manual payments such as cash, PayPal, or wire transfer so the member record stays accurate.',
      },
      {
        heading: 'Stripe fees',
        body: 'Stripe charges its normal processing fees based on your Stripe account and country. Club Lounge also applies a 2% platform fee on dues payments.',
      },
    ],
  },
  {
    slug: 'custom-domain',
    title: 'Setting up a custom domain',
    description: 'Point your own domain (e.g. lounge.yourclub.com) at your Club Lounge — available on Growth plan and above.',
    category: 'Features',
    sections: [
      {
        heading: 'Requirements',
        body: 'Custom domains are available on the Growth plan and above. You\'ll need access to your domain\'s DNS settings (typically through your registrar — GoDaddy, Namecheap, Google Domains, Cloudflare, etc.).',
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
        body: 'By default, new signups are placed in a pending queue and must be approved by an admin before they can access the lounge. You can review pending members from the Members area in your lounge admin: approve them, reject them, or request more information. If you prefer open access, you can disable approval under Settings → Features.',
      },
      {
        heading: 'Member roles',
        body: 'Every member is either a standard Member or an Admin. Admins can approve members, manage settings, post announcements, and use the lounge admin tools. Standard members can read and post in discussions, RSVP to events, view the member directory, and manage their own profile.',
      },
      {
        heading: 'Membership tiers',
        body: 'Tiers such as Full, Associate, Student, or Honorary are defined under Settings → Membership. Each member is assigned a tier at signup or by an admin. Tiers control annual dues amounts, and Growth and Pro clubs can also add trial periods for specific membership levels.',
      },
      {
        heading: 'Editing member profiles',
        body: 'Admins can edit any member\'s profile from the Members area in the lounge admin. Update their tier, contact details, custom field values, or membership status there. Members can also edit their own profile at any time.',
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
  {
    slug: 'migrating-from-clubexpress',
    title: 'Migrating from ClubExpress',
    description: 'How to export your member data from ClubExpress and get your club moved to Club Lounge.',
    category: 'Migration',
    sections: [
      {
        heading: 'What transfers over',
        body: 'ClubExpress stores member records with standard contact fields plus any custom "Additional Data Questions" you configured. All of this exports cleanly to CSV. We import names, email addresses, phone numbers, mailing addresses, membership category, join dates, and any custom field answers. Event registrant lists and financial summaries also export but are not imported into Club Lounge — we start fresh from your go-live date.',
      },
      {
        heading: 'What you will lose',
        body: 'Forum posts and discussion threads have no export path in ClubExpress — this content stays behind. Newsletter archives, website pages built in the ClubExpress site builder, and document library structure are also non-portable. Financial history exports as flat CSV rows; the data is yours, but it does not import into Club Lounge\'s payment system (which starts fresh with Stripe).',
      },
      {
        heading: 'How to export from ClubExpress',
        body: 'Log in to your ClubExpress admin panel and go to Control Panel → Club Tab → Admin Functions → Data Exports. Select the Members export, choose CSV or Excel, and download. Include all custom question columns in your export — use the field selection screen to tick every column before downloading. If you have multiple membership categories, export all of them in one file.',
      },
      {
        heading: 'Initiating the migration',
        body: 'Sign up for Club Lounge, then email hello@clublounge.app with the subject "ClubExpress migration". Attach your CSV export. We will review the column structure, map your custom fields, and load your members. The process typically takes 24–48 hours. You do not need to manually cancel ClubExpress first — wait until your members are confirmed live in Club Lounge.',
      },
      {
        heading: 'Cancelling ClubExpress',
        body: 'ClubExpress does not offer self-serve cancellation. You must contact their support team directly to cancel. There is no published exit penalty, but allow several business days for processing. Export all your data before initiating cancellation — ClubExpress may deactivate your account before you have fully transitioned.',
      },
    ],
  },
  {
    slug: 'migrating-from-memberclicks',
    title: 'Migrating from MemberClicks',
    description: 'Watch the 60-day cancellation window. Here\'s how to export your data and avoid the renewal penalty.',
    category: 'Migration',
    sections: [
      {
        heading: 'The most important thing first: the cancellation deadline',
        body: 'MemberClicks requires 60 days written notice before your renewal date to cancel. Miss this window and you owe 80% of the next annual contract — effectively a full year\'s fees for a platform you are leaving. Check your contract renewal date now and set a calendar reminder. Many clubs have been caught by this clause.',
      },
      {
        heading: 'What transfers over',
        body: 'MemberClicks exports full member profiles including all custom field values, membership type, status, and renewal history. MC Professional exports via Reporting → Exports; MemberClicks Trade (Atlas) has a separate "Export all system fields" option. Both products export to CSV. We import names, emails, phone numbers, addresses, membership tier, and custom field answers.',
      },
      {
        heading: 'What you will lose',
        body: 'Email campaign history and communication archives stay in MemberClicks. Website content built in their hosted CMS is not portable. Committee meeting minutes or documents stored inside the platform need to be downloaded manually. Transaction history exports as CSV rows — it does not import into Club Lounge\'s payment system, which starts fresh via Stripe.',
      },
      {
        heading: 'How to export from MemberClicks',
        body: 'For MC Professional: go to Reporting → Exports and download the full member export as CSV. Include the optional columns for Profile ID, notes, and renewal status. For MemberClicks Trade/Atlas: use the "Export all system fields" option to get a complete file. If you have custom fields, verify they appear as columns in the export before sending it to us.',
      },
      {
        heading: 'Initiating the migration',
        body: 'Sign up for Club Lounge and email hello@clublounge.app with the subject "MemberClicks migration". Attach your CSV export and note which product you are migrating from (MC Professional or Atlas/Trade). We handle the field mapping and will have your members loaded within 48 hours. Confirm everything looks correct in Club Lounge before sending your cancellation notice to MemberClicks.',
      },
      {
        heading: 'Sending the cancellation notice',
        body: 'Once your data is confirmed in Club Lounge, send MemberClicks written notice of cancellation. Email is sufficient — keep the confirmation. Count 60 days forward from the notice date and confirm that lands before your renewal date. If you are within 60 days of renewal already, contact MemberClicks immediately and negotiate — some account managers have discretion to waive the penalty for customers who are actively transitioning.',
      },
    ],
  },
  {
    slug: 'migrating-from-teamsnap',
    title: 'Migrating from TeamSnap',
    description: 'Export your roster and registration data from TeamSnap and move your sports club to Club Lounge.',
    category: 'Migration',
    sections: [
      {
        heading: 'What transfers over',
        body: 'TeamSnap stores rosters with contact fields per player/parent, registration form responses, and financial transaction records. We import names, email addresses, phone numbers, and any standard contact fields from your roster export. Custom roster fields may or may not be included in the CSV depending on your TeamSnap plan — test the export before relying on it.',
      },
      {
        heading: 'What you will lose',
        body: 'In-app chat and message history has no export path. Availability responses and game-day check-ins stay in TeamSnap. Photo and media uploads need to be downloaded individually. League standings and season history are not portable. TeamSnap is roster-and-schedule software — if your club used it as a full community platform, expect to rebuild the discussion and announcement history.',
      },
      {
        heading: 'How to export from TeamSnap',
        body: 'For the roster: go to your team or organization, click the Roster tab, then the Export Members button — this downloads a CSV. For registrations: go to Registration, select the form, and export responses to CSV. For finances: go to the Payments section and export transaction records. Note that org-level financial exports do not include team-level invoices — if you have multiple teams, you need a separate financial export from each team.',
      },
      {
        heading: 'Org-level vs team-level data',
        body: 'If you use TeamSnap at the organization level (multiple teams under one account), be aware that team-level data is siloed. Roster exports, financial records, and chat history are all separate per team. You will need to export each team individually if you want a complete picture of your member base.',
      },
      {
        heading: 'Initiating the migration',
        body: 'Sign up for Club Lounge and email hello@clublounge.app with the subject "TeamSnap migration". Attach your roster CSV export(s). We handle the import and will have your members loaded within 48 hours. TeamSnap has self-serve cancellation — cancel before your next billing date to avoid being charged for another cycle.',
      },
    ],
  },
  {
    slug: 'migrating-from-mighty-networks',
    title: 'Migrating from Mighty Networks',
    description: 'Your community posts are trapped — here\'s what you can save, and how to move your members to Club Lounge.',
    category: 'Migration',
    sections: [
      {
        heading: 'The hard truth about Mighty Networks',
        body: 'Mighty Networks is one of the hardest platforms to leave because community content — posts, discussions, comments, course content — has no export mechanism. Years of conversations your members had on the platform stay there. You can export your member list, but that is effectively all you can take with you.',
      },
      {
        heading: 'What transfers over',
        body: 'If you are on the Courses Plan or above, you can export a member list as an Excel file with names, email addresses, profile information, and which Spaces they belong to. This is the primary data we use for migration. We import names, emails, membership status, and any profile fields that mapped cleanly from the export.',
      },
      {
        heading: 'What you will lose',
        body: 'All post and discussion history. All direct message threads. Course content structure (individual files can be downloaded but there is no structured export). Event history. Member activity and engagement scores. Mighty Networks has deliberately not built export tools for community content, and there is no API to retrieve it programmatically.',
      },
      {
        heading: 'How to export from Mighty Networks',
        body: 'Navigate to your Network → Members → Download Member Data. This requires the Courses Plan ($99/month) or above. If you are on the base Community Plan, you cannot download your own member list — you may need to temporarily upgrade to export your data. The export delivers an Excel file to your email when ready.',
      },
      {
        heading: 'Communicating the move to your members',
        body: 'Because community content does not migrate, the transition to Club Lounge is a fresh start for discussions. We recommend posting an announcement in your Mighty Network at least 2 weeks before the move, explaining where to find your new community. Pin the post. Follow up with a direct email to all members using the exported email list. Expect roughly 60–80% of active members to make the switch — some drop-off is normal.',
      },
      {
        heading: 'Initiating the migration',
        body: 'Sign up for Club Lounge and email hello@clublounge.app with the subject "Mighty Networks migration". Attach your member Excel export. We handle the import and will have your members loaded within 48 hours. Cancel Mighty Networks via your account settings — self-serve cancellation is available.',
      },
    ],
  },
  {
    slug: 'migrating-from-facebook-groups',
    title: 'Migrating from a Facebook Group',
    description: 'Facebook gives admins no access to member emails or content exports. Here\'s how to make the move anyway.',
    category: 'Migration',
    sections: [
      {
        heading: 'Why Facebook Groups are the hardest to leave',
        body: 'Facebook is intentionally designed to prevent migration. As a group admin, you have no access to your members\' email addresses — Facebook withholds this data entirely. There is no export tool for posts, comments, files, or event history. Everything your community built together inside the group stays on Facebook\'s servers, inaccessible to you.',
      },
      {
        heading: 'What you can recover',
        body: 'Member names and Facebook profile links can be copied manually or via browser tools for smaller groups. That is essentially it. Without email addresses, you cannot contact members directly — you have to reach them through the group itself, which means the announcement and invitation process must happen before you leave.',
      },
      {
        heading: 'How to invite your members',
        body: 'Pin an announcement post in your Facebook Group explaining the move. Include your new Club Lounge sign-up link. Post at least weekly for 3–4 weeks before you wind down the group. Use Facebook Events to create a "Migration deadline" event — this triggers a separate notification to members who may have the group muted. Ask your most active members to share the announcement and personally invite others.',
      },
      {
        heading: 'Handling the email collection gap',
        body: 'Since you cannot export emails from Facebook, you need members to actively sign up at your Club Lounge link. Set up your signup form to require as little friction as possible — first and last name plus email is enough to start. You can collect additional information (phone, address, membership tier) in a second step after they are in. The easier the signup, the higher your conversion rate.',
      },
      {
        heading: 'What to expect for conversion rates',
        body: 'Realistically, expect 30–60% of your Facebook Group members to join your new lounge during the initial transition. Many Facebook accounts are dormant or attached to members who left the club years ago. The active core of your community — the people who actually post and engage — typically converts at 70–80% when the invitation is clear and repeated.',
      },
      {
        heading: 'Winding down the group',
        body: 'Do not delete your Facebook Group immediately after launching Club Lounge. Keep it active for at least 30–60 days and redirect every new post to your Club Lounge URL. After that, archive the group (Members → More → Archive Group) rather than deleting it — archived groups are invisible to non-members but preserve the history for members who want to look something up. After 6–12 months, most clubs find the group has gone fully quiet and delete it.',
      },
      {
        heading: 'Club Lounge migration support',
        body: 'Since there is no file to send us, the migration is entirely member-driven. Sign up at clublounge.app/platform/signup, configure your lounge, and share the signup link with your Facebook Group. Email hello@clublounge.app if you want help setting up your onboarding flow or welcome email to maximize conversion.',
      },
    ],
  },
]

export const CATEGORIES = ['Getting Started', 'Migration', 'Features', 'Billing & Plans'] as const
export type ArticleCategory = typeof CATEGORIES[number]
