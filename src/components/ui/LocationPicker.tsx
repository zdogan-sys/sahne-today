'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Loader2, X } from 'lucide-react'

const Inner = dynamic(() => import('./LocationPickerInner'), {
  ssr: false,
  loading: () => <div className="w-full h-56 rounded-lg bg-[rgba(228,224,216,0.04)] animate-pulse" />,
})

export function LocationPicker({ lat, lng, address, onChange }: {
  lat: number | null
  lng: number | null
  address: string
  onChange: (lat: number | null, lng: number | null) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const findFromAddress = useCallback(async () => {
    if (!address.trim()) { setError('Önce adres/şehir gir'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Bulunamadı'); setLoading(false); return }
      onChange(data.lat, data.lng)
    } catch {
      setError('Konum aranamadı')
    }
    setLoading(false)
  }, [address, onChange])

  useEffect(() => {
    if (!address.trim()) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(findFromAddress, 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [address, findFromAddress])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label">Konum (harita)</label>
        <div className="flex items-center gap-2">
          {lat != null && lng != null && (
            <button type="button" onClick={() => onChange(null, null)} className="text-[11px] text-text-muted hover:text-red-400 flex items-center gap-0.5">
              <X size={11} /> temizle
            </button>
          )}
          <button type="button" onClick={findFromAddress} disabled={loading}
            className="text-xs flex items-center gap-1 text-accent hover:underline disabled:opacity-50">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />} Adresten Bul
          </button>
        </div>
      </div>
      <Inner lat={lat} lng={lng} onChange={(la, ln) => onChange(la, ln)} />
      <p className="text-[11px] text-text-muted mt-1">
        {lat != null && lng != null
          ? `✓ Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)} — pin'i sürükleyerek düzeltebilirsin`
          : 'Adresten bul ya da haritaya tıklayarak konumu işaretle'}
      </p>
      {error && <p className="text-[11px] text-red-400 mt-0.5">{error}</p>}
    </div>
  )
}
