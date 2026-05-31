import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

// Türkiye'de sahne.today, diğer ülkelerde İngilizce varsayılan
const TR_DOMAINS = ['sahne.today']
const EN_DOMAINS = ['thestage.today']

function detectLocale(request: NextRequest): 'tr' | 'en' {
  const hostname = request.headers.get('host') ?? ''

  if (TR_DOMAINS.some(d => hostname.includes(d))) return 'tr'
  if (EN_DOMAINS.some(d => hostname.includes(d))) return 'en'

  // Cloudflare IP ülke tespiti
  const country = request.headers.get('cf-ipcountry') ?? ''
  if (country === 'TR') return 'tr'

  // Tarayıcı dil tercihi
  const acceptLanguage = request.headers.get('accept-language') ?? ''
  if (acceptLanguage.startsWith('tr')) return 'tr'

  return 'en'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API ve statik dosyalar — i18n yok
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/scan') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|json|txt|xml)$/)
  ) {
    return await updateSession(request)
  }

  // Kök path'e gelen isteği locale'e yönlendir
  if (pathname === '/') {
    const locale = detectLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    return NextResponse.redirect(url)
  }

  // next-intl middleware
  const intlResponse = intlMiddleware(request)

  // Supabase session güncelle
  const supabaseResponse = await updateSession(request)

  // Cookie'leri birleştir
  if (supabaseResponse && supabaseResponse.headers.get('set-cookie')) {
    const cookies = supabaseResponse.headers.get('set-cookie')
    if (cookies && intlResponse) {
      intlResponse.headers.set('set-cookie', cookies)
    }
  }

  return intlResponse ?? supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
