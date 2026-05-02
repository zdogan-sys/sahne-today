import type { Metadata } from 'next'
import './globals.css'
import { MobileNav } from '@/components/layout/MobileNav'
import { TopNav } from '@/components/layout/TopNav'

export const metadata: Metadata = {
  title: {
    default: 'Sahne.Today — Bağımsız Müzisyenler ve Mekanlar',
    template: '%s | Sahne.Today',
  },
  description: 'Türkiye\'nin bağımsız müzisyenleri, stand-up komedyenleri ve butik mekanları için performans ekosistemi.',
  keywords: ['müzik', 'sahne', 'canlı müzik', 'stand-up', 'türkü', 'mekan', 'sanatçı', 'istanbul', 'ankara'],
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-32x32.png',
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://sahne.today',
    siteName: 'Sahne.Today',
    title: 'Sahne.Today — Bağımsız Müzisyenler ve Mekanlar',
    description: 'Türkiye\'nin bağımsız müzisyenleri, stand-up komedyenleri ve butik mekanları için performans ekosistemi.',
    images: [{ url: '/icon-512.png', width: 512, height: 512 }],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="bg-background text-text-primary font-dm min-h-screen">
        <TopNav />
        <main className="pb-16 md:pb-0">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  )
}
