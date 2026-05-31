export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { formatTime, formatDate } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Ticket } from 'lucide-react'
import { PosterActions } from '@/components/events/PosterActions'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('title').eq('id', id).single()
  return { title: data ? `${(data as any).title} — Afiş` : 'Afiş' }
}

export default async function EventPosterPage({ params }: Props) {
  const { id } = await params
  const locale = await getLocale()
  const supabase = await createClient()

  const { data } = await supabase
    .from('events')
    .select(`
      *,
      venues(id, name, address, district, city, logo_url),
      artists(id, stage_name, genres, profiles(avatar_url)),
      bands(id, name, photo_url, genres)
    `)
    .eq('id', id)
    .single()

  if (!data) notFound()
  const event = data as any
  const venue = event.venues
  const artist = event.artists
  const band = event.bands

  const performer = artist?.stage_name ?? band?.name ?? event.artist_name ?? ''
  const performerPhoto = artist?.profiles?.avatar_url ?? band?.photo_url ?? null
  const hasPoster = !!event.poster_url

  const locationLine = venue
    ? [venue.name, venue.district, venue.city].filter(Boolean).join(' · ')
    : event.venue_name ?? null

  const entryText = event.entry_type === 'free'
    ? 'Ücretsiz Giriş'
    : event.entry_fee
    ? `${event.entry_fee}₺`
    : 'Kapıda Öde'

  return (
    <>
      {/* Print styles injected inline */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }

          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body > * { display: none !important; }
          body > main { display: block !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }

          main > div {
            display: block !important;
            min-height: 0 !important;
            background: #000 !important;
            padding: 0 !important;
          }

          #poster-wrap {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: hidden !important;
          }

          #poster-outer {
            display: block !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
          }

          #poster {
            padding-top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#060606] flex flex-col">
        {/* Toolbar */}
        <div className="no-print flex items-center px-4 py-3 border-b border-white/10">
          <Link
            href={`/events/${id}`}
            className="flex items-center gap-2 text-white/50 text-sm hover:text-white transition-colors"
          >
            <ArrowLeft size={15} />
            Etkinlik
          </Link>
        </div>

        {/* Poster area */}
        <div id="poster-wrap" className="flex-1 flex items-center justify-center p-6">
          {/* #poster-outer gives print CSS a stable anchor with explicit mm dimensions */}
          <div id="poster-outer" style={{ maxWidth: 420, width: '100%' }}>
            {/* padding-top trick: cross-platform alternative to aspect-ratio: 3/4 */}
            <div
              id="poster"
              className="relative overflow-hidden shadow-2xl"
              style={{ paddingTop: '133.33%', borderRadius: 16 }}
            >

              {/* ── MODE A: has poster image ── */}
              {hasPoster && (
                <div className="absolute inset-0">
                  <Image src={event.poster_url} alt={event.title} fill className="object-cover" sizes="420px" priority />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

                  <div className="absolute inset-0 flex flex-col justify-end p-7">
                    {/* Logos row */}
                    <div className="flex items-center gap-3 mb-4">
                      {performerPhoto && (
                        <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-accent/50 ring-offset-1 ring-offset-black flex-shrink-0">
                          <Image src={performerPhoto} alt={performer} width={56} height={56} className="object-cover w-full h-full" />
                        </div>
                      )}
                      {venue?.logo_url && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden ring-1 ring-white/20 flex-shrink-0">
                          <Image src={venue.logo_url} alt={venue.name} width={56} height={56} className="object-cover w-full h-full" />
                        </div>
                      )}
                      {event.genre && (
                        <span className="ml-auto text-[10px] font-semibold tracking-widest uppercase text-accent border border-accent/40 px-2.5 py-1 rounded-full">
                          {event.genre}
                        </span>
                      )}
                    </div>

                    {performer && (
                      <p className="font-bebas text-7xl text-accent leading-none drop-shadow-lg">{performer}</p>
                    )}
                    {event.title !== performer && (
                      <p className="font-bebas text-4xl text-white leading-tight mt-1">{event.title}</p>
                    )}
                    {event.description && (
                      <p className="text-white/65 text-xs leading-relaxed italic mt-2 mb-1 line-clamp-2">{event.description}</p>
                    )}

                    <div className="w-12 h-[2px] bg-accent my-4" />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/90">
                        <Clock size={13} className="text-accent flex-shrink-0" />
                        <span className="font-semibold text-sm">{formatDate(event.event_date, locale)}</span>
                        <span className="text-white/40">·</span>
                        <span className="text-sm">{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>
                      </div>
                      {locationLine && (
                        <div className="flex items-center gap-2 text-white/90 text-sm">
                          <MapPin size={13} className="text-accent flex-shrink-0" />
                          <span>{locationLine}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Ticket size={13} className="text-accent flex-shrink-0" />
                        <span className={event.entry_type === 'free' ? 'text-green-400 font-semibold' : 'text-white/90'}>{entryText}</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="text-white/25 text-[10px] tracking-[0.2em] uppercase">sahne.today</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MODE B: no poster image ── */}
              {!hasPoster && (
                <div className="absolute inset-0 bg-[#0a0a0a]">
                  <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent/8 blur-3xl pointer-events-none" />
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />

                  <div className="relative h-full flex flex-col p-7">

                    {/* Top bar: venue logo + genre */}
                    <div className="flex items-center justify-between">
                      {venue?.logo_url ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/15">
                          <Image src={venue.logo_url} alt={venue.name} width={56} height={56} className="object-cover w-full h-full" />
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs tracking-widest uppercase">{venue?.city ?? ''}</span>
                      )}
                      {event.genre && (
                        <span className="text-[11px] font-semibold tracking-widest uppercase text-accent border border-accent/35 px-3 py-1 rounded-full">
                          {event.genre}
                        </span>
                      )}
                    </div>

                    {/* Center: performer */}
                    <div className="flex flex-col items-center text-center flex-1 justify-center py-6">
                      {performerPhoto && (
                        <div className="w-36 h-36 rounded-full overflow-hidden mb-5 ring-2 ring-accent/40 ring-offset-2 ring-offset-[#0a0a0a]">
                          <Image src={performerPhoto} alt={performer} width={144} height={144} className="object-cover w-full h-full" />
                        </div>
                      )}
                      {performer && (
                        <p className="font-bebas text-[80px] leading-none text-accent drop-shadow-lg" style={{ letterSpacing: '0.02em' }}>
                          {performer}
                        </p>
                      )}
                      <div className="flex items-center gap-3 my-3 w-full max-w-[220px]">
                        <div className="flex-1 h-px bg-white/15" />
                        <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
                        <div className="flex-1 h-px bg-white/15" />
                      </div>
                      {event.title !== performer && (
                        <p className="font-bebas text-5xl text-white leading-tight">{event.title}</p>
                      )}
                      {event.description && (
                        <p className="text-white/55 text-xs leading-relaxed italic mt-3 line-clamp-3 max-w-[270px]">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom */}
                    <div>
                      <div className="mb-4 text-center">
                        <p className="font-bebas text-6xl text-white leading-none">{formatDate(event.event_date, locale)}</p>
                        <p className="text-accent text-xl font-bebas tracking-widest mt-1">
                          {formatTime(event.start_time)}{event.end_time ? ` — ${formatTime(event.end_time)}` : ''}
                        </p>
                      </div>

                      <div className="space-y-2 mb-4">
                        {locationLine && (
                          <div className="flex items-center gap-2 text-white/75 text-sm">
                            <MapPin size={13} className="text-accent flex-shrink-0" />
                            <span>{locationLine}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Ticket size={13} className="text-accent flex-shrink-0" />
                          <span className={event.entry_type === 'free' ? 'text-green-400 font-semibold' : 'text-white/75'}>
                            {entryText}
                          </span>
                        </div>
                      </div>

                      {/* Branding footer */}
                      <div className="border-t border-white/8 pt-4 flex items-center justify-between">
                        <span className="text-white/20 text-[10px] tracking-[0.2em] uppercase">sahne.today</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 rounded-full bg-accent/40" />
                          <div className="w-1 h-1 rounded-full bg-accent/25" />
                          <div className="w-1 h-1 rounded-full bg-accent/15" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons below poster */}
        <div className="no-print flex items-center justify-center gap-3 pb-8 px-4">
          <PosterActions eventTitle={event.title} posterUrl={event.poster_url ?? null} />
        </div>

        <p className="no-print text-center text-white/20 text-xs pb-6">
          Instagram için ekran görüntüsü alın
        </p>
      </div>
    </>
  )
}
