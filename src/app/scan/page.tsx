'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, AlertCircle, Camera, QrCode } from 'lucide-react'
import { BrowserQRCodeReader } from '@zxing/browser'

type ScanResult =
  | { type: 'success'; name: string }
  | { type: 'used' | 'invalid'; message: string }
  | null

export default function ScanPage() {
  const [result, setResult] = useState<ScanResult>(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEn, setIsEn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const lastScanned = useRef('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsEn(window.location.hostname.includes('thestage.today'))
    }
  }, [])

  useEffect(() => {
    if (!scanning) {
      controlsRef.current?.stop()
      controlsRef.current = null
      return
    }

    const reader = new BrowserQRCodeReader()
    let active = true

    reader.decodeFromVideoDevice(undefined, videoRef.current!, (res, err, controls) => {
      controlsRef.current = controls
      if (!active || !res || loading) return
      const text = res.getText()
      if (text === lastScanned.current) return
      lastScanned.current = text
      handleScan(text)
    })

    return () => {
      active = false
      controlsRef.current?.stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning])

  const handleScan = async (qrCode: string) => {
    setLoading(true)
    controlsRef.current?.stop()
    setScanning(false)

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
        setResult({ type: 'used', message: isEn ? 'This ticket has already been used' : 'Bu bilet daha önce kullanıldı' })
      } else {
        setResult({ type: 'invalid', message: data.error ?? (isEn ? 'Invalid ticket' : 'Geçersiz bilet') })
      }
    } catch {
      setResult({ type: 'invalid', message: isEn ? 'Connection error' : 'Bağlantı hatası' })
    } finally {
      setLoading(false)
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
        <h1 className="font-bebas text-2xl text-text-primary tracking-wide">{isEn ? 'SCAN TICKET' : 'BİLET TARA'}</h1>
      </div>

      {!scanning && !result && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Camera size={32} className="text-accent" />
          </div>
          <p className="text-text-muted text-sm mb-6">
            {isEn ? 'Ask the visitor to show their ticket QR code to your camera.' : 'Ziyaretçinin bilet QR kodunu kameranıza göstermesini isteyin.'}
          </p>
          <button
            onClick={() => setScanning(true)}
            className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold"
          >
            {isEn ? 'Open Camera' : 'Kamerayı Aç'}
          </button>
        </div>
      )}

      {scanning && !result && (
        <div className="card overflow-hidden">
          <div className="relative aspect-square w-full bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 border-2 border-accent/70 rounded-xl" />
            </div>
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-white text-sm font-medium">{isEn ? 'Checking...' : 'Kontrol ediliyor...'}</div>
              </div>
            )}
          </div>
          <div className="p-4 text-center">
            <button onClick={() => setScanning(false)} className="text-text-muted text-sm">
              {isEn ? 'Cancel' : 'İptal'}
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
              <p className="text-success font-bold text-xl mb-1">{isEn ? 'VALID TICKET' : 'GEÇERLİ BİLET'}</p>
              <p className="text-text-primary text-lg font-semibold mb-1">{result.name}</p>
              <p className="text-text-muted text-sm mb-6">{isEn ? 'Entry confirmed' : 'Giriş onaylandı'}</p>
            </>
          ) : result.type === 'used' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={48} className="text-red-400" />
              </div>
              <p className="text-red-400 font-bold text-xl mb-2">{isEn ? 'USED TICKET' : 'KULLANILMIŞ BİLET'}</p>
              <p className="text-text-muted text-sm mb-6">{result.message}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle size={48} className="text-red-400" />
              </div>
              <p className="text-red-400 font-bold text-xl mb-2">{isEn ? 'INVALID TICKET' : 'GEÇERSİZ BİLET'}</p>
              <p className="text-text-muted text-sm mb-6">{result.message}</p>
            </>
          )}
          <button
            onClick={reset}
            className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold"
          >
            {isEn ? 'Next Ticket' : 'Sonraki Bilet'}
          </button>
        </div>
      )}
    </div>
  )
}
