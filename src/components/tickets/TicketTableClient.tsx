'use client'

import { useState } from 'react'
import { Download, ChevronDown, ChevronUp } from 'lucide-react'

interface Ticket {
  id: string
  buyer_name: string
  buyer_surname: string
  buyer_email: string
  buyer_phone: string
  quantity: number
  total_price: number
  status: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Bekliyor', color: 'text-yellow-400' },
  paid:      { label: 'Ödendi', color: 'text-success' },
  used:      { label: 'Kullanıldı', color: 'text-text-muted' },
  cancelled: { label: 'İptal', color: 'text-red-400' },
}

export function TicketTableClient({ tickets, eventTitle }: { tickets: Ticket[]; eventTitle: string }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? tickets : tickets.slice(0, 5)

  const exportCsv = () => {
    const rows = [
      ['Ad', 'Soyad', 'Email', 'Telefon', 'Adet', 'Toplam', 'Durum', 'Tarih'],
      ...tickets.map(t => [
        t.buyer_name, t.buyer_surname, t.buyer_email, t.buyer_phone,
        t.quantity, t.total_price, t.status,
        new Date(t.created_at).toLocaleString('tr-TR'),
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `biletler-${eventTitle.replace(/\s+/g, '-')}.csv`
    a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted text-xs font-medium">{tickets.length} bilet</span>
        <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
          <Download size={12} /> CSV İndir
        </button>
      </div>

      <div className="rounded-lg border border-[rgba(228,224,216,0.08)] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[rgba(228,224,216,0.08)] bg-[rgba(228,224,216,0.03)]">
              <th className="text-left px-3 py-2 text-text-muted font-medium">Ad Soyad</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium hidden sm:table-cell">E-posta</th>
              <th className="text-center px-3 py-2 text-text-muted font-medium">Adet</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Tutar</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t, i) => {
              const s = STATUS_LABELS[t.status] ?? { label: t.status, color: 'text-text-muted' }
              return (
                <tr key={t.id} className={`border-b border-[rgba(228,224,216,0.06)] last:border-0 ${i % 2 === 0 ? '' : 'bg-[rgba(228,224,216,0.02)]'}`}>
                  <td className="px-3 py-2.5 text-text-primary font-medium">{t.buyer_name} {t.buyer_surname}</td>
                  <td className="px-3 py-2.5 text-text-muted hidden sm:table-cell">{t.buyer_email}</td>
                  <td className="px-3 py-2.5 text-text-muted text-center">{t.quantity}</td>
                  <td className="px-3 py-2.5 text-text-primary text-right font-medium">{Number(t.total_price).toFixed(0)}₺</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${s.color}`}>{s.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {tickets.length > 5 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors w-full justify-center"
        >
          {expanded ? <><ChevronUp size={12} /> Daralt</> : <><ChevronDown size={12} /> Tümünü Göster ({tickets.length})</>}
        </button>
      )}
    </div>
  )
}
