import { MetadataRoute } from 'next'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/'],
    },
    sitemap: `https://${ROOT_DOMAIN}/sitemap.xml`,
  }
}
