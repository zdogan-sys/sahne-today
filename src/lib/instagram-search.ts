// İsimden Instagram profili bulma — mekan tahmini (admin/venues/google) ve
// Instagram taramasındaki grup önerileri ortak kullanır.

export const IG_NON_HANDLE = new Set(['p', 'reel', 'reels', 'explore', 'tv', 'stories', 'accounts', 'about', 'directory'])

// Bir arama sonucu linki DİREKT bir IG profili mi? (post /p/, reel, explore değil) → handle döner.
// instagram.com/<handle> ya da /<handle>/ ya da /<handle>?... biçimini kabul eder, alt yolları reddeder.
export function profileHandleFromUrl(u: string): string | null {
  const m = u.match(/^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)\/?(?:\?|$)/i)
  if (!m) return null
  const h = m[1].toLowerCase()
  if (IG_NON_HANDLE.has(h) || h.length < 2) return null
  return h
}

// "@handle", "handle" ya da tam URL'den temiz handle çıkarır; geçersizse null.
export function cleanIgHandle(s: unknown): string | null {
  if (typeof s !== 'string' || !s.trim()) return null
  const m = s.match(/instagram\.com\/([A-Za-z0-9_.]+)/i)
  const h = (m ? m[1] : s.trim().replace(/^@/, '').replace(/\/+$/, '')).toLowerCase()
  if (!/^[a-z0-9_.]{2,30}$/.test(h) || IG_NON_HANDLE.has(h)) return null
  return h
}

// Serper.dev (Google sonuçları). Gerçek API, rate-limit/429 yok; sorgu başına 1 kredi.
// Yüksek isabet: ilk 3 organik sonuçtaki İLK direkt-profil linkini alır; profil yoksa null
// döner (alakasız bir handle önermez). SERPER_API_KEY tanımlı değilse pas geçer.
export async function serperInstagram(name: string, city: string): Promise<string | null> {
  const key = process.env.SERPER_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${name} ${city} instagram`.replace(/\s+/g, ' ').trim(), gl: 'tr', hl: 'tr', num: 10 }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const links: string[] = (data.organic ?? []).map((o: any) => o.link).filter(Boolean)
    for (const l of links.slice(0, 3)) {
      const h = profileHandleFromUrl(l)
      if (h) return `https://www.instagram.com/${h}/`
    }
    return null
  } catch {
    return null
  }
}
