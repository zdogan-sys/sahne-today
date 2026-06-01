import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { getSiteUrl, buildAlternates } from '@/lib/seo'
import '../globals.css'
import { MobileNav } from '@/components/layout/MobileNav'
import { TopNav } from '@/components/layout/TopNav'
import { PWAInstallBanner } from '@/components/PWAInstallBanner'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'
  const siteUrl = await getSiteUrl()
  const siteName = isEn ? 'The Stage.Today' : 'Sahne.Today'

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: isEn
        ? 'The Stage.Today — Live Music & Performance Ecosystem'
        : 'Sahne.Today — Canlı Müzik ve Performans Ekosistemi',
      template: `%s | ${siteName}`,
    },
    description: isEn
      ? 'Find open stages, book artists, discover live events — for independent musicians, comedians, and boutique venues.'
      : 'Açık sahne bul, sanatçı ayırt, canlı etkinlikleri keşfet — bağımsız müzisyenler, komedyenler ve butik mekanlar için.',
    alternates: buildAlternates(locale, ''),
    openGraph: {
      type: 'website',
      siteName,
      images: [{ url: '/icon-512.png', width: 512, height: 512 }],
    },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4537E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sahne.Today" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-background text-text-primary font-dm min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <TopNav />
          <main className="pb-16 md:pb-0">
            {children}
          </main>
          <MobileNav />
          <PWAInstallBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
