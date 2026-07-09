// muhasebe.today ön muhasebe API'sine satış faturası kesme yardımcısı.
// MUHASEBE_API_KEY tanımlı değilse entegrasyon kapalı sayılır ve sessizce
// atlanır; fatura kesilememesi bilet akışını asla bozmamalıdır (asla throw
// etmez, hata console'a yazılır).
//
// Env:
//   MUHASEBE_API_URL       (vars. https://app.muhasebe.today/api/v1)
//   MUHASEBE_API_KEY       omk_... (muhasebe.today > Ayarlar > API Anahtarları;
//                          invoice:write + contact:write kapsamlı)
//   MUHASEBE_TICKET_VAT    bilet KDV oranı, vars. 20 (fiyatlar KDV DAHİL kabul edilir)
//   MUHASEBE_SEND_EINVOICE "1" ise fatura kesilince e-Belge de gönderilir

const API_URL = process.env.MUHASEBE_API_URL ?? 'https://app.muhasebe.today/api/v1'
const API_KEY = process.env.MUHASEBE_API_KEY
const VAT_RATE = Number(process.env.MUHASEBE_TICKET_VAT ?? '20')
const SEND_EDOC = process.env.MUHASEBE_SEND_EINVOICE === '1'

export type TicketInvoiceInput = {
  merchantOid: string // PayTR sipariş no; mükerrer korumasının anahtarı
  buyerName: string
  buyerEmail: string
  buyerPhone?: string | null
  eventTitle: string
  quantity: number
  unitPriceGross: number // KDV dahil birim fiyat (alıcının ödediği)
}

export type TicketInvoiceResult = {
  id: string
  invoiceNo: string
  grandTotal: string
} | null

export async function createTicketInvoice(input: TicketInvoiceInput): Promise<TicketInvoiceResult> {
  if (!API_KEY) return null

  // Fiyatlar KDV dahil; API net birim fiyat bekler
  const unitNet = input.unitPriceGross / (1 + VAT_RATE / 100)

  try {
    const res = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        type: 'SALES',
        externalRef: `SAHNE-${input.merchantOid}`,
        contact: {
          name: input.buyerName,
          email: input.buyerEmail,
          phone: input.buyerPhone || undefined,
        },
        description: `sahne.today bilet satışı — Sipariş ${input.merchantOid}`,
        sendEInvoice: SEND_EDOC,
        items: [
          {
            name: `Bilet: ${input.eventTitle}`,
            quantity: input.quantity,
            unitPrice: unitNet.toFixed(4),
            vatRate: String(VAT_RATE),
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.data) {
      console.error('muhasebe invoice error:', res.status, json?.error ?? json)
      return null
    }
    console.log(
      `muhasebe invoice ${json.duplicate ? 'exists' : 'created'}:`,
      json.data.invoiceNo,
      'for',
      input.merchantOid
    )
    return json.data
  } catch (err) {
    console.error('muhasebe invoice request failed:', err)
    return null
  }
}
