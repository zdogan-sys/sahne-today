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
