import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { finalizePendingRuns } from '@/lib/instagram-scan'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const result = await finalizePendingRuns(admin)
  return NextResponse.json({ success: true, ...result })
}
