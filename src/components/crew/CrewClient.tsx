'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Plus, MapPin, Mail, Calendar } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { GenreChip } from '@/components/ui/GenreChip'
import { createClient } from '@/lib/supabase/client'
import type { CrewListing, Profile } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

import { ALL_GENRES } from '@/lib/constants'

type ListingFull = CrewListing & { profiles: Pick<Profile, 'display_name' | 'city'> | null }

const ROLE_OPTIONS = ['Basçı', 'Davulcu', 'Gitarist', 'Klavyeci', 'Vokal', 'Komedyen Ortağı', 'Kemancı', 'Yapımcı', 'DJ']

export function CrewClient({ initialListings }: { initialListings: ListingFull[] }) {
  const isEn = useLocale() === 'en'
  const [listings, setListings] = useState<ListingFull[]>(initialListings)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="relative">
      {listings.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">
          <p>{isEn ? 'No listings yet. Post the first one!' : 'Henüz ilan yok. İlk ilanı siz verin!'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 z-40 bg-accent text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-accent/90 transition-colors"
        aria-label={isEn ? 'Post Listing' : 'İlan Ver'}
      >
        <Plus size={24} />
      </button>

      <CrewListingForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(listing) => setListings([listing as ListingFull, ...listings])}
      />
    </div>
  )
}

function ListingCard({ listing }: { listing: ListingFull }) {
  const isEn = useLocale() === 'en'
  const date = new Date(listing.created_at)
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000)

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          {listing.profiles?.display_name && (
            <p className="text-text-muted text-xs mb-0.5">{listing.profiles.display_name}</p>
          )}
          <h3 className="font-semibold text-text-primary">{listing.title}</h3>
        </div>
        <span className="text-text-muted text-xs flex-shrink-0 flex items-center gap-1 mt-1">
          <Calendar size={10} />
          {daysAgo === 0 ? (isEn ? 'Today' : 'Bugün') : (isEn ? `${daysAgo}d ago` : `${daysAgo}g önce`)}
        </span>
      </div>

      {listing.description && (
        <p className="text-text-muted text-sm leading-relaxed mb-3">{listing.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {listing.roles_needed?.map((role) => (
          <span key={role} className="chip bg-accent/10 text-accent border border-accent/20">{role}</span>
        ))}
        {listing.genres?.map((g) => <GenreChip key={g} genre={g} />)}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[rgba(228,224,216,0.06)]">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {listing.city && (
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {listing.city}
            </span>
          )}
          <span>{listing.profiles?.display_name}</span>
        </div>
        <a
          href={`mailto:${listing.contact_email}`}
          className="flex items-center gap-1.5 text-accent text-xs hover:underline"
        >
          <Mail size={12} />
          {isEn ? 'Contact' : 'İletişim'}
        </a>
      </div>
    </div>
  )
}

function CrewListingForm({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (listing: any) => void
}) {
  const isEn = useLocale() === 'en'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggle<T>(arr: T[], setArr: (v: T[]) => void, item: T) {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item])
  }

  async function handleSubmit() {
    if (!title || !contactEmail) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/auth'; return }

    const { data, error: err } = await supabase.from('crew_listings').insert({
      poster_id: user.id,
      title, description: description || null,
      genres, roles_needed: roles,
      city: city || null,
      contact_email: contactEmail,
      status: 'open',
    } as any).select('*, profiles(display_name, city)').single()

    if (err || !data) {
      setError(isEn ? 'Could not post listing.' : 'İlan gönderilemedi.')
    } else {
      onCreated(data)
      onClose()
      setTitle(''); setDescription(''); setGenres([]); setRoles([]); setCity(''); setContactEmail('')
    }
    setLoading(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEn ? 'Looking for a Band / Crew' : 'Grup / Ekip Arıyorum'}>
      <div className="space-y-4">
        <p className="text-text-muted text-xs -mt-2">{isEn ? 'Introduce yourself to bands looking for you.' : 'Seni arayan gruplara kendini tanıt.'}</p>
        <div>
          <label className="label">{isEn ? 'Title *' : 'Başlık *'}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isEn ? 'e.g. Drummer looking for an active band' : 'Örn: Davulcuyum, aktif grup arıyorum'} className="input-field" />
        </div>
        <div>
          <label className="label">{isEn ? 'About' : 'Hakkında'}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={isEn ? 'Introduce yourself, your experience, expectations...' : 'Kendinizi tanıtın, deneyiminiz, beklentileriniz...'} className="input-field resize-none" />
        </div>
        <div>
          <label className="label">{isEn ? 'My Roles' : 'Rollerim'}</label>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_OPTIONS.map((r) => (
              <button key={r} type="button" onClick={() => toggle(roles, setRoles, r)}
                className={cn('chip border transition-colors', roles.includes(r) ? 'bg-accent/10 text-accent border-accent/30' : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)]')}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">{isEn ? 'My Genres' : 'Müzik Türlerim'}</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_GENRES.map((g) => (
              <button key={g} type="button" onClick={() => toggle(genres, setGenres, g)}
                className={cn('chip border transition-colors', genres.includes(g) ? 'bg-accent/10 text-accent border-accent/30' : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)]')}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{isEn ? 'City' : 'Şehir'}</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={isEn ? 'Istanbul' : 'İstanbul'} className="input-field" />
          </div>
          <div>
            <label className="label">{isEn ? 'Contact Email *' : 'İletişim E-posta *'}</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="sen@mail.com" className="input-field" />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={handleSubmit} disabled={loading || !title || !contactEmail} className="btn-accent w-full py-3 disabled:opacity-40">
          {loading ? (isEn ? 'Posting...' : 'Gönderiliyor...') : (isEn ? 'Post Listing' : 'İlan Ver')}
        </button>
      </div>
    </BottomSheet>
  )
}
