'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles?: { display_name: string; avatar_url?: string | null }
}

interface Props {
  reviews: Review[]
  targetType: 'artist' | 'venue' | 'course'
  targetId: string
  userId: string | null
  userReview?: Review | null
}

function Stars({ rating, interactive, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          className={cn('focus:outline-none', interactive ? 'cursor-pointer' : 'cursor-default')}
        >
          <Star
            size={interactive ? 20 : 13}
            className={cn(
              'transition-colors',
              (interactive ? (hover || rating) : rating) >= i
                ? 'text-[#d4a820] fill-[#d4a820]'
                : 'text-[rgba(228,224,216,0.2)]'
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewSection({ reviews, targetType, targetId, userId, userReview: initialUserReview }: Props) {
  const [allReviews, setAllReviews] = useState(reviews)
  const [userReview, setUserReview] = useState<Review | null>(initialUserReview ?? null)
  const [rating, setRating] = useState(initialUserReview?.rating ?? 0)
  const [comment, setComment] = useState(initialUserReview?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const avg = allReviews.length
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Puan seçin.'); return }
    setSaving(true); setError('')

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [`${targetType}_id`]: targetId,
        rating,
        comment: comment || null,
      }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Hata oluştu.'); setSaving(false); return }

    setUserReview(data.review)
    setAllReviews(prev => {
      const idx = prev.findIndex(r => r.id === data.review.id)
      if (idx >= 0) return prev.map(r => r.id === data.review.id ? data.review : r)
      return [data.review, ...prev]
    })
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-bebas text-2xl text-text-primary">DEĞERLENDİRMELER</h2>
          {avg && (
            <div className="flex items-center gap-1.5">
              <Stars rating={Math.round(Number(avg))} />
              <span className="text-text-primary font-semibold text-sm">{avg}</span>
              <span className="text-text-muted text-xs">({allReviews.length})</span>
            </div>
          )}
        </div>
        {userId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs text-accent hover:underline"
          >
            {userReview ? 'Yorumu Güncelle' : 'Yorum Yap'}
          </button>
        )}
      </div>

      {showForm && userId && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3">
          <div>
            <label className="label mb-1.5">Puan *</label>
            <Stars rating={rating} interactive onRate={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Yorumunuz (opsiyonel)"
            rows={3}
            className="input-field text-sm resize-none w-full"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={saving || !rating} className="btn-accent py-2 px-4 text-sm disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <><Loader2 size={12} className="animate-spin" /> Kaydediliyor...</> : 'Kaydet'}
          </button>
        </form>
      )}

      {allReviews.length === 0 ? (
        <p className="text-text-muted text-sm">Henüz değerlendirme yok.</p>
      ) : (
        <div className="space-y-3">
          {allReviews.map(r => (
            <div key={r.id} className="card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary text-sm font-medium">{r.profiles?.display_name ?? 'Anonim'}</span>
                  <Stars rating={r.rating} />
                </div>
                <span className="text-text-muted text-xs">
                  {new Date(r.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {r.comment && <p className="text-text-muted text-sm">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
