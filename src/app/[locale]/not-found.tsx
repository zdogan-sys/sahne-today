import Link from 'next/link'
import { getLocale } from 'next-intl/server'

export default async function NotFound() {
  const isEn = (await getLocale()) === 'en'
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-bebas text-8xl text-accent opacity-20 mb-4">404</h1>
      <h2 className="font-bebas text-3xl text-text-primary mb-2">{isEn ? 'PAGE NOT FOUND' : 'SAYFA BULUNAMADI'}</h2>
      <p className="text-text-muted text-sm mb-8">{isEn ? 'The page you are looking for does not exist.' : 'Aradığınız sayfa mevcut değil.'}</p>
      <Link href="/" className="btn-accent">{isEn ? 'Back to Home' : 'Ana Sayfaya Dön'}</Link>
    </div>
  )
}
