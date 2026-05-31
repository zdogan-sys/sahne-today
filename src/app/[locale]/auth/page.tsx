import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'
import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth')
  return { title: `${t('signin')} / ${t('signup')}` }
}

export default async function AuthPage() {
  const t = await getTranslations('auth')
  const locale = await getLocale()
  const logoText = locale === 'tr' ? 'SAHNE.TODAY' : 'THE STAGE'

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-bebas text-5xl text-text-primary">{logoText}</h1>
          <p className="text-text-muted text-sm mt-2">
            {t('signin')} / {t('signup')}
          </p>
        </div>
        <Suspense fallback={<div className="card p-6 animate-pulse h-64" />}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  )
}
