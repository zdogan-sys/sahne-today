import { NextResponse } from 'next/server'
import { notifyFollowers } from '@/app/actions/follow'

export async function POST(req: Request) {
  try {
    const { eventId } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'missing eventId' }, { status: 400 })
    await notifyFollowers(eventId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
