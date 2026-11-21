import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/seo'
import { getCities, slugifyCity } from '@/lib/cities'

type Row = { id: string; created_at: string }

// PostgREST tek istekte en fazla 1000 satır döndürüyor (self-hosted max_rows) —
// eskiden .limit(500) ile 1367 etkinliğin 500'ü rastgele sırayla giriyordu.
// Tüm kayıtları 1000'lik sayfalarla, id sırasıyla (kaymasız) çeker.
async function fetchAllRows(
  build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>
): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) return rows
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) return rows
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl()
  const locale = siteUrl.includes('thestage.today') ? 'en' : 'tr'
  const baseUrl = `${siteUrl}/${locale}`
  const supabase = await createClient()

  const [events, venues, artists, bands, cities] = await Promise.all([
    fetchAllRows((from, to) => supabase.from('events').select('id, created_at').eq('status', 'confirmed' as any).order('id').range(from, to)),
    fetchAllRows((from, to) => supabase.from('venues').select('id, created_at').order('id').range(from, to)),
    fetchAllRows((from, to) => supabase.from('artists').select('id, created_at').order('id').range(from, to)),
    fetchAllRows((from, to) => supabase.from('bands').select('id, created_at').order('id').range(from, to)),
    getCities(supabase),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/venues`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/artists`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/bands`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
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

  const bandRoutes = bands.map((b) => ({
    url: `${baseUrl}/bands/${b.id}`,
    lastModified: new Date(b.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const cityRoutes = cities.map((c) => ({
    url: `${baseUrl}/${slugifyCity(c)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...cityRoutes, ...eventRoutes, ...venueRoutes, ...artistRoutes, ...bandRoutes]
}
