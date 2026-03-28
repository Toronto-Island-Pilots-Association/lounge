import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClubLoungeLanding } from '@/components/club-lounge/ClubLoungeLanding'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'
const BASE_URL = `https://${ROOT_DOMAIN}`
const IS_DEV = process.env.NODE_ENV === 'development'
const PROTOCOL = IS_DEV ? 'http' : 'https'
const PORT = IS_DEV ? ':3000' : ''

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Club Lounge',
      url: BASE_URL,
      logo: `${BASE_URL}/icon.png`,
      contactPoint: { '@type': 'ContactPoint', email: `hello@${ROOT_DOMAIN}`, contactType: 'customer support' },
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'Club Lounge',
      publisher: { '@id': `${BASE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Club Lounge',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: BASE_URL,
      description:
        'Private community software for clubs and associations. Member directory, discussions, events, and dues collection — all on your own URL.',
      offers: [
        { '@type': 'Offer', name: 'Hobby', price: '5', priceCurrency: 'CAD', billingIncrement: 'P1M' },
        { '@type': 'Offer', name: 'Starter', price: '49', priceCurrency: 'CAD', billingIncrement: 'P1M' },
        { '@type': 'Offer', name: 'Community', price: '99', priceCurrency: 'CAD', billingIncrement: 'P1M' },
        { '@type': 'Offer', name: 'Club Pro', price: '199', priceCurrency: 'CAD', billingIncrement: 'P1M' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How much does Club Lounge cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Plans start at $5/month for small clubs (up to 20 members). Starter is $49/month for unlimited members with dues collection. Community is $99/month with digest emails and analytics. All plans include a 14-day free trial.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I migrate from Wild Apricot?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. We offer free member data migration from Wild Apricot, typically completed within 48 hours.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do members get their own URL?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Every club gets its own subdomain (yourclub.clublounge.app). Starter plan and above can use a fully custom domain like lounge.yourclub.com.',
          },
        },
        {
          '@type': 'Question',
          name: 'What types of clubs use Club Lounge?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Flying clubs, yacht clubs, cycling clubs, golf clubs, rowing clubs, photography societies, professional association chapters, alumni associations, and more. Any club that needs a private community home.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does dues collection work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Club Lounge uses Stripe Connect. Set your annual or monthly dues amount, and members pay directly. Automatic renewals, instant payment records, and a clear view of who has paid — all from your admin dashboard. Available on Starter plan and above.',
          },
        },
      ],
    },
  ],
}

export default async function MarketingHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/platform/dashboard')
  const demoOrigin = `${PROTOCOL}://demo.${ROOT_DOMAIN}${PORT}/discussions`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ClubLoungeLanding
        rootDomain={ROOT_DOMAIN}
        signupHref="/platform/signup"
        loginHref="/platform/login"
        demoHref={demoOrigin}
        internalLinks={false}
      />
    </>
  )
}
