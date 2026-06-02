import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MERCHANT_ID = process.env.PAYTR_MERCHANT_ID!
const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

const PRICES: Record<string, number> = {
  individual: 299,
  venue: 499,
}

export async function POST(req: NextRequest) {
  try {
    const { plan, venue_id } = await req.json()

    if (!plan || !PRICES[plan]) {
      return NextResponse.json({ error: 'Geçersiz plan' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()

    // Venue planı için venue owner kontrolü
    if (plan === 'venue' && venue_id) {
      const { data: venue } = await supabase.from('venues').select('owner_id').eq('id', venue_id).single()
      if (!venue || venue.owner_id !== user.id) {
        return NextResponse.json({ error: 'Mekan bulunamadı' }, { status: 403 })
      }
    }

    const admin = createAdminClient()
    const totalPrice = PRICES[plan]
    const merchantOid = `PRO${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    // Pro purchase kaydı oluştur
    await admin.from('pro_purchases').insert({
      user_id: user.id,
      plan,
      venue_id: venue_id ?? null,
      merchant_oid: merchantOid,
      amount: totalPrice,
      status: 'pending',
    } as any).select()

    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
    const paymentAmount = Math.round(totalPrice * 100)
    const productName = plan === 'individual' ? 'Sahne Pro Sanatçı' : 'Sahne Pro Mekan'
    const userBasket = Buffer.from(JSON.stringify([[productName, totalPrice.toFixed(2), 1]])).toString('base64')
    const noInstallment = 0; const maxInstallment = 0; const currency = 'TL'; const testMode = 1
    const userName = (profile as any)?.display_name ?? user.email ?? 'Kullanıcı'

    const hashStr = `${MERCHANT_ID}${userIp}${merchantOid}${user.email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`
    const paytrToken = crypto.createHmac('sha256', MERCHANT_KEY).update(hashStr + MERCHANT_SALT).digest('base64')

    const params = new URLSearchParams({
      merchant_id: MERCHANT_ID, user_ip: userIp, merchant_oid: merchantOid,
      email: user.email!, payment_amount: String(paymentAmount), paytr_token: paytrToken,
      user_basket: userBasket, debug_on: '1', no_installment: String(noInstallment),
      max_installment: String(maxInstallment), user_name: userName,
      user_address: 'Türkiye', user_phone: '05000000000',
      merchant_ok_url: `${SITE_URL}/pro/success?order_id=${merchantOid}`,
      merchant_fail_url: `${SITE_URL}/pro?error=1`,
      timeout_limit: '30', currency, test_mode: String(testMode),
    })

    const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', { method: 'POST', body: params })
    const paytrData = await paytrRes.json()

    if (paytrData.status !== 'success') {
      return NextResponse.json({ error: paytrData.reason ?? 'PayTR hatası' }, { status: 500 })
    }

    return NextResponse.json({ token: paytrData.token, merchant_oid: merchantOid })
  } catch (err) {
    console.error('pro/buy error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
