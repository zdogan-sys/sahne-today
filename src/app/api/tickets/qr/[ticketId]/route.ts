import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params
  const supabase = createAdminClient()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('qr_code, status')
    .eq('id', ticketId)
    .single()

  if (!ticket?.qr_code) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const buffer = await QRCode.toBuffer(ticket.qr_code, { width: 300, margin: 2 })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
