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
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="bg-background text-text-primary font-dm min-h-screen">
        <TopNav />
        <main className="pb-16 md:pb-0">
          {children}
        </main>
        <MobileNav />
        {modal}
      </body>
    </html>
  )
}
