export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { buildAlternates, localeBase } from '@/lib/seo'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GenreChip } from '@/components/ui/GenreChip'
import { VENUE_TYPE_LABELS, formatDate } from '@/lib/utils'
import { MapPin, Phone, Mail, Users, Zap, ArrowLeft, Music, Images, CalendarDays, GraduationCap } from 'lucide-react'
import { ReviewSection } from '@/components/ui/ReviewSection'
import { isAdminUser } from '@/lib/admin'
import { SocialLinks } from '@/components/ui/SocialLinks'
import { VenueCoverEditor } from '@/components/venues/VenueCoverEditor'
import { VenueMap } from '@/components/venues/VenueMap'
import { VenueLogoEditor } from '@/components/venues/VenueLogoEditor'
import { VenueVideoEditor } from '@/components/venues/VenueVideoEditor'
import { VenueSocialEditor } from '@/components/venues/VenueSocialEditor'
import { VenueProfileEditor } from '@/components/venues/VenueProfileEditor'
import { VenueSlotsList } from '@/components/venues/VenueSlotsList'
import { FollowButton } from '@/components/ui/FollowButton'
import { VenueEventTabs } from '@/components/venues/VenueEventTabs'
import { ClaimVenueButton } from '@/components/venues/ClaimVenueButton'
import { ProBadge } from '@/components/ui/ProBadge'
import type { SocialLinksData } from '@/components/ui/SocialLinks'
import type { Venue, Slot, Event } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('venues').select('name, description, city, photo_url').eq('id', id).single()
  const venue = data as any | null
  if (!venue) return { title: locale === 'en' ? 'Venue Not Found' : 'Mekan Bulunamadı' }
  const title = `${venue.name} — ${venue.city}`
  const description = venue.description ?? undefined
  const image = venue.photo_url ?? `${localeBase(locale)}/icon-512.png`
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/venues/${id}`),
    openGraph: { title, description, images: [{ url: image }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function VenuePage({ params }: Props) {
  const { id, locale } = await params
  const isEn = locale === 'en'
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const artistRes = user ? await supabase.from('artists').select('id').eq('profile_id', user.id).maybeSingle() : null
  const isArtist = !!artistRes?.data

  const today = new Date().toISOString().split('T')[0]

  const isOwnerCheck = async () => {
    const { data: v } = await supabase.from('venues').select('owner_id').eq('id', id).single()
    return v?.owner_id === user?.id || isAdminUser(user)
  }
  const ownerCheck = await isOwnerCheck()

  const [venueRes, slotsRes, upcomingEventsRes, pastEventsRes, followData, coursesRes, teachingSlotsRes, instructorsRes, reviewsRes, userReviewRes, templatesRes] = await Promise.all([
    supabase.from('venues').select('*').eq('id', id).single(),
    ownerCheck
      ? supabase.from('slots').select('*').eq('venue_id', id).order('day_of_week')
      : supabase.from('slots').select('*').eq('venue_id', id).eq('status', 'open').order('day_of_week'),
    ownerCheck
      ? supabase.from('events')
          .select('id, title, event_date, start_time, end_time, genre, description, status, artists(stage_name), bands(name)')
          .eq('venue_id', id)
          .in('status', ['confirmed', 'offered', 'pending'])
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(30)
      : supabase.from('events')
          .select('id, title, event_date, start_time, end_time, genre, description, artists(stage_name), bands(name)')
          .eq('venue_id', id)
          .eq('status', 'confirmed')
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(30),
    ownerCheck
      ? supabase.from('events')
          .select('id, title, event_date, start_time, end_time, genre, description, status, artists(stage_name), bands(name)')
          .eq('venue_id', id)
          .in('status', ['confirmed', 'offered', 'pending'])
          .lt('event_date', today)
          .order('event_date', { ascending: false })
          .limit(20)
      : supabase.from('events')
          .select('id, title, event_date, start_time, end_time, genre, description, artists(stage_name), bands(name)')
          .eq('venue_id', id)
          .eq('status', 'confirmed')
          .lt('event_date', today)
          .order('event_date', { ascending: false })
          .limit(20),
    user
      ? supabase.from('follows').select('id').eq('user_id', user.id).eq('target_type', 'venue').eq('target_id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('courses').select('id, title, category, level, price_per_session, billing_type, monthly_price, created_at, max_participants, course_sessions(session_date), course_enrollments(id, status)').eq('venue_id', id).eq('status', 'active'),
    supabase.from('teaching_slots').select('id, instrument, day_of_week, slot_date, start_time, end_time, price_per_session, lesson_type, is_online').eq('venue_id', id).eq('is_active', true),
    supabase.from('venue_instructors').select('id, name, instruments, bio, photo_url').eq('venue_id', id).eq('is_active', true),
    supabase.from('reviews').select('id, rating, comment, created_at, profiles(display_name, avatar_url)').eq('venue_id', id).order('created_at', { ascending: false }),
    user ? supabase.from('reviews').select('*').eq('venue_id', id).eq('reviewer_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('venue_lesson_templates').select('id, name, subject, weeks, hours_per_session, price_total, billing_type, monthly_price, days_per_week').eq('venue_id', id).eq('is_active', true).order('created_at'),
  ])

  if (!venueRes.data) notFound()
  const venue = venueRes.data as unknown as Venue
  const slots = (slotsRes.data ?? []) as unknown as Slot[]
  const upcomingEvents = (upcomingEventsRes.data ?? []) as any[]
  const pastEvents = (pastEventsRes.data ?? []) as any[]
  const coursesAtVenue = ((coursesRes.data ?? []) as any[])
    .map((c: any) => {
      const dates = (c.course_sessions ?? []).map((s: any) => s.session_date).filter(Boolean).sort()
      return { ...c, startDate: dates[0] ?? null }
    })
    .sort((a: any, b: any) => (b.startDate ?? b.created_at ?? '').localeCompare(a.startDate ?? a.created_at ?? ''))
  const lessonTemplates = (templatesRes.data ?? []) as any[]
  const teachingSlotsAtVenue = (teachingSlotsRes.data ?? []) as any[]
  const venueInstructors = (instructorsRes.data ?? []) as any[]
  const venueReviews = (reviewsRes.data ?? []) as any[]
  const userVenueReview = (userReviewRes as any)?.data ?? null
  const isOwner = user?.id === venue.owner_id || isAdminUser(user)
  const isStudioType = ['studio', 'dance_studio', 'music_school'].includes((venue as any).venue_type)

  // Gerçek sahip (admin değil) stüdyo/dersane → doğrudan yönetim sayfasına (hub)
  if (user?.id === venue.owner_id && isStudioType) {
    redirect(`/${locale}/dashboard/venue/${venue.id}`)
  }

  const canSeeSlots = (isOwner || isArtist) && !isStudioType
  const isFollowing = !!(followData as any)?.data?.id
  const photos: string[] = (venue as any).photos ?? []
  const videoUrls: string[] = (venue as any).video_urls ?? []
  const socialLinks = ((venue as any).social_links ?? {}) as SocialLinksData

  const base = `https://sahne.today`
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Sahne.Today', item: base },
      { '@type': 'ListItem', position: 2, name: isEn ? 'Venues' : 'Mekanlar', item: `${base}/venues` },
      { '@type': 'ListItem', position: 3, name: venue.name, item: `${base}/venues/${id}` },
    ],
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicVenue',
    name: venue.name,
    description: (venue as any).description ?? undefined,
    url: `https://sahne.today/venues/${id}`,
    image: (venue as any).photo_url ?? 'https://sahne.today/icon-512.png',
    telephone: (venue as any).phone ?? undefined,
    email: (venue as any).email ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: (venue as any).address ?? undefined,
      addressLocality: (venue as any).city,
      addressRegion: (venue as any).district ?? undefined,
      addressCountry: 'TR',
    },
    maximumAttendeeCapacity: (venue as any).capacity_standing ?? (venue as any).capacity_seated ?? undefined,
    sameAs: [
      socialLinks.instagram ? (socialLinks.instagram.startsWith('http') ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace('@', '')}`) : null,
      socialLinks.facebook ?? null,
    ].filter(Boolean),
  }

  return (
    <div className="max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero / cover */}
      <div className="relative h-64 md:h-96 bg-surface">
        {isOwner && (
          <VenueProfileEditor
            venueId={venue.id}
            initialData={{
              name: venue.name,
              city: venue.city,
              district: venue.district,
              address: venue.address,
              phone: venue.phone,
              email: venue.email,
              venue_type: venue.venue_type,
              venue_types: (venue as any).venue_types ?? [],
              capacity_seated: venue.capacity_seated,
              capacity_standing: venue.capacity_standing,
              stage_area_m2: venue.stage_area_m2,
              equipment: venue.equipment ?? [],
              genres: venue.genres ?? [],
              description: venue.description,
              photo_url: venue.photo_url ?? null,
              logo_url: venue.logo_url ?? null,
              is_hidden: (venue as any).is_hidden ?? false,
              price_per_hour: (venue as any).price_per_hour ?? null,
              latitude: (venue as any).latitude ?? null,
              longitude: (venue as any).longitude ?? null,
            }}
          />
        )}
        <VenueCoverEditor
          venueId={venue.id}
          initialUrl={venue.photo_url ?? ''}
          name={venue.name}
          isOwner={isOwner}
        />
        {/* Overlay content — sits above the editor's camera overlay via z-index */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
          <Link
            href="/venues"
            className="pointer-events-auto flex items-center gap-1 text-text-muted text-sm mb-3 hover:text-text-primary w-fit"
          >
            <ArrowLeft size={14} />
            {isEn ? 'Venues' : 'Mekanlar'}
          </Link>
          <div className="flex items-end gap-3">
            <div className="pointer-events-auto">
              <VenueLogoEditor
                venueId={venue.id}
                initialUrl={venue.logo_url ?? null}
                name={venue.name}
                isOwner={isOwner}
              />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-bebas text-5xl md:text-6xl text-text-primary drop-shadow-lg">{venue.name}</h1>
                {(venue as any).is_pro_venue && <ProBadge />}
                {user?.id !== venue.owner_id && (
                  <span className="pointer-events-auto mt-1">
                    <FollowButton targetType="venue" targetId={venue.id} initialFollowing={isFollowing} userId={user?.id ?? null} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {((venue as any).venue_types?.length ? (venue as any).venue_types : [venue.venue_type]).map((t: string) => (
                  <span key={t} className="chip bg-[rgba(228,224,216,0.1)] text-text-muted border-[rgba(228,224,216,0.15)]">
                    {VENUE_TYPE_LABELS[t] ?? t}
                  </span>
                ))}
                {venue.verified && (
                  <span className="chip bg-success/10 text-success border-success/20">Doğrulandı</span>
                )}
                {!(venue as any).owner_id && user && (venue as any).owner_id !== user?.id && (
                  <span className="pointer-events-auto">
                    <ClaimVenueButton venueId={venue.id} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-text-muted">
              <MapPin size={16} className="mt-0.5 text-accent flex-shrink-0" />
              <div>
                <p className="text-text-primary">{venue.address}</p>
                <p>{venue.district}, {venue.city}</p>
              </div>
            </div>
            {venue.phone && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Phone size={16} className="text-accent" />
                <a href={`tel:${venue.phone}`} className="hover:text-text-primary">{venue.phone}</a>
              </div>
            )}
            {venue.email && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Mail size={16} className="text-accent" />
                <a href={`mailto:${venue.email}`} className="hover:text-text-primary">{venue.email}</a>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Users size={16} className="text-accent" />
              <span>
                {venue.capacity_standing ? `${venue.capacity_standing} ayakta` : ''}
                {venue.capacity_seated ? ` · ${venue.capacity_seated} oturarak` : ''}
                {venue.stage_area_m2 ? ` · Sahne ${venue.stage_area_m2}m²` : ''}
              </span>
            </div>

            {venue.equipment && venue.equipment.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm text-text-muted">
                  <Zap size={16} className="text-accent" />
                  <span>Ekipman</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {venue.equipment.map((eq) => (
                    <span key={eq} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{eq}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Harita */}
        {(venue as any).latitude != null && (venue as any).longitude != null && (
          <div className="space-y-2">
            <VenueMap lat={(venue as any).latitude} lng={(venue as any).longitude} name={venue.name} />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${(venue as any).latitude},${(venue as any).longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <MapPin size={14} /> {isEn ? 'Get Directions' : 'Yol Tarifi Al'}
            </a>
          </div>
        )}

        {!isOwner && (['studio', 'dance_studio', 'music_school'].includes((venue as any).venue_type)) && (
          <Link
            href={`/studios/${venue.id}`}
            className="btn-accent py-3 px-6 text-sm w-full text-center"
          >
            {isEn ? 'Reserve' : 'Rezervasyon Yap'}
          </Link>
        )}

        {venue.genres && venue.genres.length > 0 && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">{isEn ? 'EVENT TYPE' : 'ETKİNLİK TÜRÜ'}</h2>
            <div className="flex flex-wrap gap-2">
              {venue.genres.map((g) => <GenreChip key={g} genre={g} />)}
            </div>
          </div>
        )}

        {venue.description && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-2">HAKKINDA</h2>
            <p className="text-text-muted text-sm leading-relaxed">{venue.description}</p>
          </div>
        )}

        {/* Videos */}
        <VenueVideoEditor venueId={venue.id} initialUrls={videoUrls} readOnly={!isOwner} />

        {/* Social links */}
        {isOwner ? (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">{isEn ? 'SOCIAL MEDIA' : 'SOSYAL MEDYA'}</h2>
            <VenueSocialEditor venueId={venue.id} initialLinks={socialLinks} />
          </div>
        ) : Object.keys(socialLinks).length > 0 ? (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">{isEn ? 'SOCIAL MEDIA' : 'SOSYAL MEDYA'}</h2>
            <SocialLinks links={socialLinks} />
          </div>
        ) : null}

        {/* Calendar link — stüdyolarda gizle */}
        {!isStudioType && (
          <Link
            href={`/venues/${venue.id}/calendar`}
            className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-accent" />
              <div>
                <span className="text-text-primary text-sm font-medium">{isEn ? 'Calendar' : 'Takvim'}</span>
                <p className="text-text-muted text-xs mt-0.5">{isEn ? 'Events and open stages' : 'Etkinlikler ve açık sahneler'}</p>
              </div>
            </div>
            <span className="text-text-muted text-xs">→</span>
          </Link>
        )}

        {/* Derslerimiz — ders teklifleri (şablonlar) + özel ders */}
        {(lessonTemplates.length > 0 || ['dance_studio', 'music_school'].includes((venue as any).venue_type)) && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">{isEn ? 'OUR LESSONS' : 'DERSLERİMİZ'}</h2>
            <div className="space-y-2">
              {lessonTemplates.map((tmpl) => (
                <Link
                  key={tmpl.id}
                  href={`/venues/${venue.id}/lessons/${tmpl.id}`}
                  className="card p-3 flex items-center justify-between hover:border-accent/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm">{tmpl.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {tmpl.subject && `${tmpl.subject} · `}
                      {tmpl.billing_type === 'monthly'
                        ? `${isEn ? 'Monthly' : 'Aylık'} · ${isEn ? 'weekly' : 'haftada'} ${tmpl.days_per_week ?? 1} ${isEn ? 'days' : 'gün'} · ${tmpl.hours_per_session} ${isEn ? 'h/day' : 'saat/gün'}`
                        : `${tmpl.weeks} ${isEn ? 'weeks' : 'hafta'} · ${tmpl.hours_per_session} ${isEn ? 'h/session' : 'saat/seans'}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    {tmpl.billing_type === 'monthly'
                      ? (tmpl.monthly_price > 0 && <span className="font-bebas text-accent text-lg">₺{tmpl.monthly_price}<span className="text-[10px] font-sans text-text-muted">/ay</span></span>)
                      : (tmpl.price_total > 0 && <span className="font-bebas text-accent text-lg">₺{tmpl.price_total}</span>)}
                    <p className="text-accent text-xs">{isOwner ? (isEn ? '+ Add student →' : '+ Kayıt Ekle →') : (isEn ? 'Book →' : 'Talep Et →')}</p>
                  </div>
                </Link>
              ))}

              {/* Özel ders — öğrenci enstrüman/hafta/saat/zaman seçer */}
              {['dance_studio', 'music_school'].includes((venue as any).venue_type) && (
                <Link
                  href={`/venues/${venue.id}/lessons/custom`}
                  className="card p-3 flex items-center justify-between hover:border-accent/30 transition-colors border-dashed border-accent/30"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-accent text-sm">{isOwner ? (isEn ? '+ Custom Lesson Enrollment' : '+ Özel Ders Kaydı') : (isEn ? 'Custom Lesson' : '+ Özel Ders Talebi')}</p>
                    <p className="text-text-muted text-xs mt-0.5">{isOwner ? (isEn ? 'Enroll a student in a custom lesson' : 'Öğrenciyi özel derse kaydet') : (isEn ? 'Pick your instrument, weeks, hours and time' : 'Enstrüman, hafta, saat ve zamanı sen belirle')}</p>
                  </div>
                  <span className="text-accent text-xs flex-shrink-0 ml-3">{isOwner ? (isEn ? 'Add →' : 'Kayıt Ekle →') : (isEn ? 'Request →' : 'Talep Et →')}</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Yeni Açılan Kurslarımız — gerçek kurslar (sondan geriye) */}
        {coursesAtVenue.length > 0 && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">{isEn ? 'NEW COURSES' : 'YENİ AÇILAN KURSLARIMIZ'}</h2>
            <div className="space-y-2">
              {coursesAtVenue.map((course) => (
                <Link
                  key={course.id}
                  href={isOwner ? `/dashboard/courses/${course.id}` : `/courses/${course.id}`}
                  className="card p-3 hover:border-accent/30 transition-colors block"
                >
                  {course.startDate && (
                    <p className="text-accent text-xs font-medium mb-1">
                      {new Date(course.startDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <p className="font-medium text-text-primary text-sm">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[rgba(228,224,216,0.15)] text-text-muted">
                      {course.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-accent/20 text-accent bg-accent/5">
                      {course.level}
                    </span>
                    <span className="ml-auto font-bebas text-accent">{course.billing_type === 'monthly' ? `₺${course.monthly_price ?? 0}/ay` : `₺${course.price_per_session}`}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {canSeeSlots && (
          <VenueSlotsList
            slots={slots as any[]}
            venueId={venue.id}
            isOwner={isOwner}
            hasUser={!!user}
          />
        )}

        {/* Eğitmenler */}
        {venueInstructors.length > 0 && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3 flex items-center gap-2">
              <GraduationCap size={18} className="text-accent" />
              {isEn ? 'INSTRUCTORS' : 'EĞİTMENLER'}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {venueInstructors.map(inst => (
                <div key={inst.id} className="card p-4 flex items-start gap-3">
                  {inst.photo_url ? (
                    <img src={inst.photo_url} alt={inst.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[rgba(212,168,32,0.15)] flex items-center justify-center flex-shrink-0">
                      <GraduationCap size={18} className="text-[#d4a820]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm">{inst.name}</p>
                    {inst.instruments && inst.instruments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {inst.instruments.map((i: string) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{i}</span>
                        ))}
                      </div>
                    )}
                    {inst.bio && <p className="text-text-muted text-xs mt-1.5 line-clamp-2">{inst.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Değerlendirmeler */}
        <ReviewSection
          reviews={venueReviews}
          targetType="venue"
          targetId={venue.id}
          userId={user?.id ?? null}
          userReview={userVenueReview}
        />

        {!isStudioType && (upcomingEvents.length > 0 || pastEvents.length > 0 || isOwner) && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">{isEn ? 'EVENTS' : 'ETKİNLİKLER'}</h2>
            <VenueEventTabs
              upcoming={upcomingEvents}
              past={pastEvents}
              isOwner={isOwner}
              venueId={venue.id}
              venueCity={venue.city}
            />
          </div>
        )}

        {/* Photo album link — en altta */}
        <Link
          href={`/venues/${venue.id}/photos`}
          className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Images size={18} className="text-text-muted" />
            <span className="text-text-primary text-sm font-medium">{isEn ? 'Photo Album' : 'Fotoğraf Albümü'}</span>
          </div>
          <span className="text-text-muted text-xs">{photos.length} {isEn ? 'photos →' : 'fotoğraf →'}</span>
        </Link>
      </div>
    </div>
  )
}
