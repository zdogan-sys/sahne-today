import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id')
  if (!orderId) return NextResponse.json({ error: 'order_id gerekli' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('tickets')
    .select('status')
    .eq('paytr_order_id', orderId)
    .single()

  return NextResponse.json({ status: data?.status ?? 'not_found' })
}
