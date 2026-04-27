import type { Metadata } from 'next'
import { ArtistRegisterForm } from '@/components/artists/ArtistRegisterForm'

export const metadata: Metadata = {
  title: 'Sanatçı Ol',
  description: 'Sanatçı profilinizi oluşturun ve mekan tekliflerini kabul edin.',
}

export default function ArtistRegisterPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="font-bebas text-5xl text-text-primary mb-2">SANATÇI OL</h1>
        <p className="text-text-muted text-sm mb-8">Profilini oluştur, mekan tekliflerini kabul et, sahneye çık.</p>
        <ArtistRegisterForm />
      </div>
    </div>
  )
}
