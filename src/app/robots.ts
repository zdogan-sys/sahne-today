import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getSiteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/auth/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
