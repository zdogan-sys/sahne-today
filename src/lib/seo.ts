import { headers } from 'next/headers'

/** İsteğin geldiği domain'i (proxy arkasında x-forwarded-host) döndürür. */
export async function getSiteUrl(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'sahne.today'
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

const TR_BASE = 'https://sahne.today'
const EN_BASE = 'https://thestage.today'

/**
 * Bir sayfa için canonical + hreflang alternatiflerini üretir.
 * @param locale aktif locale ('tr' | 'en')
 * @param pathAfterLocale locale'den sonraki yol, örn "/events/123" (kök için "")
 */
export function buildAlternates(locale: string, pathAfterLocale: string) {
  const trUrl = `${TR_BASE}/tr${pathAfterLocale}`
  const enUrl = `${EN_BASE}/en${pathAfterLocale}`
  return {
    canonical: locale === 'en' ? enUrl : trUrl,
    languages: {
      tr: trUrl,
      en: enUrl,
      'x-default': trUrl,
    },
  }
}

/** Locale'e göre OG/sosyal görsel için mutlak domain. */
export function localeBase(locale: string): string {
  return locale === 'en' ? EN_BASE : TR_BASE
}

/**
 * Meta description: kayıttaki metin (açıklama/bio) varsa ~160 karaktere kısaltır,
 * boşsa verilen yedek cümleyi kullanır — açıklamasız sayfada Google rastgele
 * metin seçiyordu (Kasım 2026: 188 mekanın 185'i, 52 sanatçının 43'ü boştu).
 */
export function metaDescription(text: string | null | undefined, fallback: string): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  if (clean.length <= 160) return clean
  const cut = clean.slice(0, 157)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 100 ? cut.lastIndexOf(' ') : 157)}…`
}
