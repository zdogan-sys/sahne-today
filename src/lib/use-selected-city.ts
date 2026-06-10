'use client'

import { useState, useEffect } from 'react'

// Üstteki global şehir seçicisini (TopNav) okur ve değişimini dinler.
// 'Tümü' / boş → '' döner (tüm şehirler). Diğer durumda şehir adını döner.
export function useSelectedCity(): string {
  const [city, setCity] = useState('')
  useEffect(() => {
    const read = () => {
      const c = localStorage.getItem('sahne_city')
      setCity(c && c !== 'Tümü' ? c : '')
    }
    read()
    window.addEventListener('city_changed', read)
    return () => window.removeEventListener('city_changed', read)
  }, [])
  return city
}
