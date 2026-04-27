import type { Metadata } from 'next'
import { VenueRegisterForm } from '@/components/venues/VenueRegisterForm'

export const metadata: Metadata = {
  title: 'Mekan Ekle',
  description: 'Mekanınızı Sahne.Today\'e ekleyin ve sanatçılarla buluşun.',
}

export default function VenueRegisterPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-bebas text-5xl text-text-primary mb-2">MEKAN EKLE</h1>
        <p className="text-text-muted text-sm mb-8">Mekanınızı kaydedin, açık sahnelerinizi yönetin.</p>
        <VenueRegisterForm />
      </div>
    </div>
  )
}
