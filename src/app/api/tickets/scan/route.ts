import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { qr_code } = await req.json()
  if (!qr_code) return NextResponse.json({ error: 'QR kod gerekli' }, { status: 400 })

  const adminClient = createAdminClient()

  const { data: ticket } = await adminClient
    .from('tickets')
    .select('id, buyer_name, buyer_surname, status, event_id, events(venue_id, venues(owner_id))')
    .eq('qr_code', qr_code)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Geçersiz bilet' }, { status: 404 })

  const event = ticket.events as any
  const ownerIdOfVenue = event?.venues?.owner_id

  if (ownerIdOfVenue !== user.id) {
    return NextResponse.json({ error: 'Bu bileti tarama yetkiniz yok' }, { status: 403 })
  }

  if (ticket.status === 'used') {
    return NextResponse.json({ error: 'Bu bilet daha önce kullanıldı', status: 'used' }, { status: 409 })
  }

  if (ticket.status !== 'paid') {
    return NextResponse.json({ error: 'Geçersiz bilet durumu', status: ticket.status }, { status: 400 })
  }

  await adminClient.from('tickets').update({ status: 'used' }).eq('id', ticket.id)

  return NextResponse.json({
    success: true,
    name: `${ticket.buyer_name} ${ticket.buyer_surname}`,
  })
}
