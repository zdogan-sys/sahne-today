import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    const merchant_oid = body.get('merchant_oid') as string
    const status = body.get('status') as string
    const total_amount = body.get('total_amount') as string
    const hash = body.get('hash') as string

    const hashStr = merchant_oid + MERCHANT_SALT + status + total_amount
    const expected = crypto.createHmac('sha256', MERCHANT_KEY).update(hashStr).digest('base64')

    if (hash !== expected) {
      return new Response('PAYTR_ERROR', { status: 400 })
    }

    const admin = createAdminClient()

    const { data: purchase } = await admin
      .from('pro_purchases')
      .select('*')
      .eq('merchant_oid', merchant_oid)
      .single()

    if (!purchase) return new Response('OK')

    if (status === 'success') {
      await admin.from('pro_purchases').update({ status: 'paid' } as any).eq('merchant_oid', merchant_oid)

      if ((purchase as any).plan === 'individual') {
        await admin.from('profiles').update({ is_pro_individual: true } as any).eq('id', (purchase as any).user_id)
      } else if ((purchase as any).plan === 'venue' && (purchase as any).venue_id) {
        await admin.from('venues').update({ is_pro_venue: true } as any).eq('id', (purchase as any).venue_id)
      }
    } else {
      await admin.from('pro_purchases').update({ status: 'failed' } as any).eq('merchant_oid', merchant_oid)
    }

    return new Response('OK')
  } catch (err) {
    console.error('pro/callback error:', err)
    return new Response('OK')
  }
}
