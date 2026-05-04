'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, AlertCircle, Camera, QrCode } from 'lucide-react'
import dynamic from 'next/dynamic'

const QrReader = dynamic(() => import('react-qr-reader').then(m => m.QrReader), { ssr: false })

type ScanResult = { type: 'success'; name: string } | { type: 'used' | 'invalid'; message: string } | null

export default function ScanPage() {
  const [result, setResult] = useState<ScanResult>(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const lastScanned = useRef('')

  const handleScan = async (qrCode: string) => {
    if (!qrCode || qrCode === lastScanned.current || loading) return
    lastScanned.current = qrCode
    setLoading(true)

    try {
      const res = await fetch('/api/tickets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrCode }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setResult({ type: 'success', name: data.name })
      } else if (res.status === 409) {
        setResult({ type: 'used', message: 'Bu bilet daha önce kullanıldı' })
      } else {
        setResult({ type: 'invalid', message: data.error ?? 'Geçersiz bilet' })
      }
    } catch {
      setResult({ type: 'invalid', message: 'Bağlantı hatası' })
    } finally {
      setLoading(false)
      setScanning(false)
    }
  }

  const reset = () => {
    setResult(null)
    lastScanned.current = ''
    setScanning(true)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 min-h-screen">
      <div className="flex items-center gap-2 mb-6">
        <QrCode size={20} className="text-accent" />
        <h1 className="font-bebas text-2xl text-text-primary tracking-wide">BİLET TARA</h1>
      </div>

      {!scanning && !result && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Camera size={32} className="text-accent" />
          </div>
          <p className="text-text-muted text-sm mb-6">
            Ziyaretçinin bilet QR kodunu kameranıza göstermesini isteyin.
          </p>
          <button
            onClick={() => setScanning(true)}
            className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold"
          >
            Kamerayı Aç
          </button>
        </div>
      )}

      {scanning && !result && (
        <div className="card overflow-hidden">
          <div className="relative aspect-square w-full">
            {typeof window !== 'undefined' && (
              <QrReader
                onResult={(res) => { if (res) handleScan(res.getText()) }}
                constraints={{ facingMode: 'environment' }}
                containerStyle={{ width: '100%', height: '100%' }}
                videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                scanDelay={500}
              />
            )}
            {/* Crosshair overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 border-2 border-accent/70 rounded-xl" />
            </div>
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-white text-sm font-medium">Kontrol ediliyor...</div>
              </div>
            )}
          </div>
          <div className="p-4 text-center">
            <button onClick={() => setScanning(false)} className="text-text-muted text-sm">
              İptal
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`card p-8 text-center ${result.type === 'success' ? 'border-success/30 bg-success/5' : 'border-red-500/30 bg-red-500/5'}`}>
          {result.type === 'success' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={48} className="text-success" />
              </div>
              <p className="text-success font-bold text-xl mb-1">GEÇERLİ BİLET</p>
              <p className="text-text-primary text-lg font-semibold mb-1">{result.name}</p>
              <p className="text-text-muted text-sm mb-6">Giriş onaylandı</p>
            </>
          ) : result.type === 'used' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={48} className="text-red-400" />
              </div>
              <p className="text-red-400 font-bold text-xl mb-2">KULLANILMIŞ BİLET</p>
              <p className="text-text-muted text-sm mb-6">{result.message}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle size={48} className="text-red-400" />
              </div>
              <p className="text-red-400 font-bold text-xl mb-2">GEÇERSİZ BİLET</p>
              <p className="text-text-muted text-sm mb-6">{result.message}</p>
            </>
          )}
          <button
            onClick={reset}
            className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold"
          >
            Sonraki Bilet
          </button>
        </div>
      )}
    </div>
  )
}
