import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GENRE_COLORS: Record<string, string> = {
  Rock: '#e86042',
  'Stand-Up': '#d4a820',
  Türkü: '#1D9E75',
  Caz: '#8f88d4',
  Solist: '#D4537E',
  Pop: '#5ba4cf',
  Jazz: '#8f88d4',
  Folk: '#1D9E75',
  Elektronik: '#a78bfa',
}

export function getGenreColor(genre: string): string {
  return GENRE_COLORS[genre] ?? '#D4537E'
}

export const VENUE_TYPE_LABELS: Record<string, string> = {
  pub: 'Pub',
  turku_bar: 'Türkü Bar',
  live_music: 'Canlı Müzik',
  bookstore: 'Kitabevi',
  theater: 'Tiyatro',
  cafe: 'Kafe',
  other: 'Diğer',
}

export const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

export const FEE_MODEL_LABELS: Record<string, string> = {
  free: 'Ücretsiz',
  door_share: 'Kapı Paylaşımı',
  guarantee: 'Garanti',
  negotiable: 'Pazarlığa Açık',
}

export function formatTime(time: string): string {
  return time.substring(0, 5)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  return null
}

export function getVideoEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return null
}
