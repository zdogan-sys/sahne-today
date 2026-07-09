import type { SupabaseClient } from '@supabase/supabase-js'

// TopNav'daki global şehir seçicinin listesi ('Tümü' = filtre yok)
export const KNOWN_CITIES = ['Tümü', 'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa', 'Eskişehir']

// ?city= slug'ını bilinen şehir adına çevirir (client-safe, DB gerektirmez)
export function cityFromSlug(slug: string): string | null {
  return KNOWN_CITIES.find((c) => c !== 'Tümü' && slugifyCity(c) === slug) ?? null
}

// Türkçe karakterleri URL slug'ına çevirir: İstanbul -> istanbul, Muğla -> mugla
export function slugifyCity(name: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }
  return name
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (ch) => map[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Mekanı olan şehirlerin tekilleştirilmiş listesi
export async function getCities(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('venues').select('city').not('city', 'is', null)
  const set = new Set<string>()
  for (const row of (data ?? []) as { city: string | null }[]) {
    const c = (row.city ?? '').trim()
    if (c) set.add(c)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
}

export async function getCityBySlug(supabase: SupabaseClient, slug: string): Promise<string | null> {
  const cities = await getCities(supabase)
  return cities.find((c) => slugifyCity(c) === slug) ?? null
}
