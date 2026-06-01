import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl()
  const locale = siteUrl.includes('thestage.today') ? 'en' : 'tr'
  const baseUrl = `${siteUrl}/${locale}`
  const supabase = await createClient()

  const [eventsRes, venuesRes, artistsRes] = await Promise.all([
    supabase.from('events').select('id, created_at').eq('status', 'confirmed' as any).limit(500),
    supabase.from('venues').select('id, created_at').limit(500),
    supabase.from('artists').select('id, created_at').limit(500),
  ])

  const events = (eventsRes.data ?? []) as { id: string; created_at: string }[]
  const venues = (venuesRes.data ?? []) as { id: string; created_at: string }[]
  const artists = (artistsRes.data ?? []) as { id: string; created_at: string }[]

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/venues`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/artists`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/crew`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
  ]

  const eventRoutes = events.map((e) => ({
    url: `${baseUrl}/events/${e.id}`,
    lastModified: new Date(e.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const venueRoutes = venues.map((v) => ({
    url: `${baseUrl}/venues/${v.id}`,
    lastModified: new Date(v.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const artistRoutes = artists.map((a) => ({
    url: `${baseUrl}/artists/${a.id}`,
    lastModified: new Date(a.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...eventRoutes, ...venueRoutes, ...artistRoutes]
}
