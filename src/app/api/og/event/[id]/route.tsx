import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Afişi olmayan etkinlikler için 1200x630 paylaşım kartı üretir.
// generateMetadata: poster_url ?? bu rota.
// Fontlar public/fonts'tan okunur (Türkçe karakterler için DejaVu).

let fontsPromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf')),
    readFile(path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans-Bold.ttf')),
  ]).then(([regular, bold]) => ({ regular, bold }))
  return fontsPromise
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: ev } = await admin
    .from('events')
    .select('title, event_date, start_time, entry_type, entry_fee, genre, venues(name, city), artists(stage_name), bands(name)')
    .eq('id', id)
    .single()

  if (!ev) return new Response('Not found', { status: 404 })

  const venue = (ev as any).venues
  const performer = (ev as any).artists?.stage_name ?? (ev as any).bands?.name ?? null
  const dateLabel = new Date(ev.event_date).toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeLabel = ev.start_time ? ev.start_time.slice(0, 5) : null
  const entry = ev.entry_type === 'free' ? 'Ücretsiz' : ev.entry_fee ? `${ev.entry_fee}₺` : 'Kapıda'

  const { regular, bold } = await loadFonts()

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', backgroundColor: '#121212',
        backgroundImage: 'radial-gradient(ellipse 700px 350px at 80% -10%, rgba(212,83,126,0.35), transparent)',
        padding: '56px 64px', fontFamily: 'DejaVu',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#D4537E', display: 'flex' }} />
          <span style={{ color: '#E4E0D8', fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>SAHNE.TODAY</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{
            color: '#E4E0D8', fontSize: ev.title.length > 40 ? 54 : 68,
            fontWeight: 700, lineHeight: 1.1, maxWidth: 1050,
          }}>
            {ev.title}
          </span>
          {performer && (
            <span style={{ color: '#D4537E', fontSize: 34, fontWeight: 700 }}>{performer}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ color: '#E4E0D8', fontSize: 30 }}>
            {dateLabel}{timeLabel ? `  ·  ${timeLabel}` : ''}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {venue?.name && (
              <span style={{ color: '#9a9a8e', fontSize: 26 }}>
                📍 {venue.name}{venue.city ? `, ${venue.city}` : ''}
              </span>
            )}
            <span style={{
              color: '#D4537E', fontSize: 22, border: '2px solid rgba(212,83,126,0.5)',
              borderRadius: 20, padding: '4px 16px', display: 'flex',
            }}>
              {entry}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'DejaVu', data: regular, weight: 400 },
        { name: 'DejaVu', data: bold, weight: 700 },
      ],
      headers: { 'Cache-Control': 'public, max-age=3600' },
    }
  )
}
