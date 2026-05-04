import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('events')
    .select('id, title, event_date, start_time, ticket_price, ticket_count, tickets_sold, ticketing_enabled, venues(name, address, commission_rate)')
    .eq('id', id)
    .single()

  if (!data) return NextResponse.json(null, { status: 404 })
  return NextResponse.json(data)
}
