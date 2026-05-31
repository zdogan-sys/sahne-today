import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata: Metadata = {
  title: 'Giriş / Kayıt',
}

export default function AuthPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-bebas text-5xl text-text-primary">SAHNE.TODAY</h1>
          <p className="text-text-muted text-sm mt-2">Hesabınıza giriş yapın veya yeni hesap oluşturun</p>
        </div>
        <Suspense fallback={<div className="card p-6 animate-pulse h-64" />}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  )
}
