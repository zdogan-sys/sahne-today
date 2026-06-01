export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Clock, Users, MapPin, Video } from 'lucide-react'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

const CATEGORY_LABELS: Record<string, string> = {
  music: 'Müzik', dance: 'Dans', theater: 'Tiyatro', other: 'Diğer',
}
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Başlangıç', intermediate: 'Orta', advanced: 'İleri', all: 'Hepsi',
}
const TYPE_LABELS: Record<string, string> = {
  individual: 'Bireysel', group: 'Grup', package: 'Paket',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('title').eq('id', id).single()
  return { title: data?.title ?? 'Kurs' }
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*, profiles(id, display_name, avatar_url, bio), venues(id, name, city), course_sessions(id, session_date, start_time, end_time, status), course_enrollments(id, gender, status)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!course) notFound()

  const instructor = (course as any).profiles
  const venue = (course as any).venues
  const sessions: any[] = (course as any).course_sessions ?? []
  const enrollments: any[] = (course as any).course_enrollments?.filter((e: any) => e.status === 'confirmed') ?? []

  const availableSessions = sessions.filter((s) => s.status === 'available')
  const femaleCount = enrollments.filter((e: any) => e.gender === 'female').length
  const maleCount = enrollments.filter((e: any) => e.gender === 'male').length
  const remaining = (course as any).max_participants - enrollments.length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/courses" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> Kurslar
      </Link>

      {/* Başlık */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="chip bg-accent/10 text-accent border border-accent/20 text-xs">
            {CATEGORY_LABELS[(course as any).category] ?? (course as any).category}
          </span>
          <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)] text-xs">
            {TYPE_LABELS[(course as any).course_type] ?? (course as any).course_type}
          </span>
          {(course as any).level && (
            <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)] text-xs">
              {LEVEL_LABELS[(course as any).level]}
            </span>
          )}
          {(course as any).is_online && (
            <span className="chip bg-success/10 text-success border border-success/20 text-xs flex items-center gap-1">
              <Video size={10} /> Online
            </span>
          )}
        </div>
        <h1 className="font-bebas text-4xl text-text-primary">{(course as any).title}</h1>
        {(course as any).subcategory && (
          <p className="text-text-muted text-sm mt-1">{(course as any).subcategory}</p>
        )}
      </div>

      {/* Eğitmen kartı */}
      {instructor && (
        <div className="card p-4 flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex-shrink-0 overflow-hidden flex items-center justify-center text-accent font-bold text-lg">
            {instructor.avatar_url ? (
              <Image src={instructor.avatar_url} alt={instructor.display_name} width={56} height={56} className="object-cover w-full h-full" />
            ) : (
              instructor.display_name?.[0]?.toUpperCase() ?? '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text-primary">{instructor.display_name}</p>
            <p className="text-text-muted text-xs mt-0.5">Eğitmen</p>
            {instructor.bio && (
              <p className="text-text-muted text-xs mt-1 line-clamp-2">{instructor.bio}</p>
            )}
          </div>
        </div>
      )}

      {/* Kurs bilgileri */}
      <div className="card p-4 space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Clock size={15} className="text-accent flex-shrink-0" />
          <span>{(course as any).duration_minutes} dakika / seans</span>
        </div>
        {(course as any).location && !((course as any).is_online) && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <MapPin size={15} className="text-accent flex-shrink-0" />
            <span>{(course as any).location}</span>
          </div>
        )}
        {venue && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <MapPin size={15} className="text-accent flex-shrink-0" />
            <Link href={`/venues/${venue.id}`} className="hover:text-text-primary">
              {venue.name}, {venue.city}
            </Link>
          </div>
        )}
        {(course as any).course_type === 'group' && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Users size={15} className="text-accent flex-shrink-0" />
            <span>
              {enrollments.length}/{(course as any).max_participants} katılımcı
              {remaining > 0 ? ` · ${remaining} kontenjan kaldı` : ' · Dolu'}
            </span>
          </div>
        )}
        {(course as any).description && (
          <div className="pt-3 border-t border-[rgba(228,224,216,0.08)]">
            <p className="text-text-primary text-sm leading-relaxed">{(course as any).description}</p>
          </div>
        )}
      </div>

      {/* Grup dersi cinsiyet dağılımı */}
      {(course as any).course_type === 'group' && (femaleCount > 0 || maleCount > 0) && (
        <div className="card p-4 mb-6">
          <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Kadın / Erkek Dağılımı</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Kadın</span>
                <span>{femaleCount}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(228,224,216,0.08)]">
                <div
                  className="h-full rounded-full bg-pink-400/70"
                  style={{ width: `${(femaleCount / Math.max(1, (course as any).max_participants)) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Erkek</span>
                <span>{maleCount}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(228,224,216,0.08)]">
                <div
                  className="h-full rounded-full bg-blue-400/70"
                  style={{ width: `${(maleCount / Math.max(1, (course as any).max_participants)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Müsait seanslar */}
      <div className="mb-6">
        <h2 className="font-bebas text-2xl text-text-primary mb-3">MÜSAİT SEANSLAR</h2>
        {availableSessions.length === 0 ? (
          <div className="card p-4 text-center text-text-muted text-sm">Şu an müsait seans yok.</div>
        ) : (
          <div className="space-y-2">
            {availableSessions.map((s) => (
              <Link
                key={s.id}
                href={`/courses/${id}/enroll?session=${s.id}`}
                className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
              >
                <div>
                  <p className="text-text-primary text-sm font-medium">
                    {new Date(s.session_date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bebas text-xl text-accent">₺{(course as any).price_per_session}</span>
                  <span className="text-accent text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Kayıt ol butonu */}
      <Link
        href={`/courses/${id}/enroll`}
        className="btn-accent w-full py-3 text-center flex items-center justify-center gap-2 text-sm"
      >
        Kayıt Ol
      </Link>
    </div>
  )
}
