'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BandInviteSearch } from './BandInviteSearch'

const GENRE_OPTIONS = ['Rock', 'Stand-Up', 'Türkü', 'Caz', 'Solist', 'Pop', 'Folk', 'Elektronik', 'R&B', 'Rap']
const CITY_OPTIONS = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Eskişehir', 'Adana', 'Kayseri']

interface Props {
  userId: string   // profile id
  artistId: string // artist record id
}

export function BandSection({ userId, artistId }: Props) {
  const [bands, setBands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [invitingBandId, setInvitingBandId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newGenres, setNewGenres] = useState<string[]>([])
  const [newCity, setNewCity] = useState('')
  const [newBio, setNewBio] = useState('')
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    load()
    const channel = supabase
      .channel('band-section')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'band_members' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    const [membershipRes, createdRes] = await Promise.all([
      supabase
        .from('band_members')
        .select('bands(id, name, genres, city, bio, photo_url, creator_id, created_at, band_members(id, artist_id, role, status, artists(id, stage_name, profiles(avatar_url))))')
        .eq('artist_id', artistId)
        .eq('status', 'accepted'),
      supabase
        .from('bands')
        .select('id, name, genres, city, bio, photo_url, creator_id, created_at, band_members(id, artist_id, role, status, artists(id, stage_name, profiles(avatar_url)))')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false }),
    ])

    const fromMemberships = (membershipRes.data ?? []).map((m: any) => m.bands).filter(Boolean)
    const fromCreated = (createdRes.data ?? []) as any[]

    const seen = new Set<string>()
    const all: any[] = []
    for (const b of [...fromCreated, ...fromMemberships]) {
      if (b && !seen.has(b.id)) {
        seen.add(b.id)
        all.push({ ...b, members: b.band_members ?? [] })
      }
    }
    setBands(all)
    setLoading(false)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)

    const { data: band, error } = await supabase
      .from('bands')
      .insert({ creator_id: userId, name: newName.trim(), genres: newGenres, city: newCity || null, bio: newBio || null } as any)
      .select()
      .single()

    if (!error && band) {
      await supabase.from('band_members').insert({
        band_id: (band as any).id,
        artist_id: artistId,
        role: 'Kurucu',
        status: 'accepted',
        joined_at: new Date().toISOString(),
      } as any)
      setNewName(''); setNewGenres([]); setNewCity(''); setNewBio('')
      setShowCreate(false)
      await load()
    }
    setCreating(false)
  }

  if (loading) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bebas text-2xl text-text-primary">GRUPLARIM</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <Plus size={15} />
          Grup Kur
        </button>
      </div>

      {showCreate && (
        <div className="card p-4 mb-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Yeni Grup</h3>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Grup adı *"
            className="input-field"
          />
          <div>
            <label className="label">Müzik Türleri</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((g) => (
                <button key={g} type="button"
                  onClick={() => setNewGenres(newGenres.includes(g) ? newGenres.filter((x) => x !== g) : [...newGenres, g])}
                  className={cn('chip border text-xs transition-colors', newGenres.includes(g)
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.1)]'
                  )}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <select value={newCity} onChange={(e) => setNewCity(e.target.value)} className="input-field">
            <option value="">Şehir seçin</option>
            {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea
            value={newBio}
            onChange={(e) => setNewBio(e.target.value)}
            placeholder="Kısa açıklama (opsiyonel)"
            rows={2}
            className="input-field resize-none text-sm"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-outline flex-1 text-sm py-2">İptal</button>
            <button onClick={handleCreate} disabled={!newName.trim() || creating} className="btn-accent flex-1 text-sm py-2 disabled:opacity-40">
              {creating ? 'Oluşturuluyor...' : 'Grubu Kur'}
            </button>
          </div>
        </div>
      )}

      {bands.length === 0 && !showCreate ? (
        <div className="card p-6 text-center text-text-muted text-sm">
          <Users size={28} className="mx-auto mb-2 opacity-40" />
          <p>Henüz bir grubunuz yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bands.map((band) => {
            const isCreator = band.creator_id === userId
            const accepted = (band.members ?? []).filter((m: any) => m.status === 'accepted')
            const pendingCount = (band.members ?? []).filter((m: any) => m.status === 'invited').length
            const existingIds = (band.members ?? []).map((m: any) => m.artist_id)
            const isInviting = invitingBandId === band.id

            return (
              <div key={band.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent font-bold text-base">
                      {band.photo_url ? (
                        <Image src={band.photo_url} alt={band.name} width={40} height={40} className="object-cover w-full h-full" />
                      ) : band.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/bands/${band.id}`} className="font-medium text-text-primary text-sm hover:text-accent transition-colors">
                          {band.name}
                        </Link>
                        {isCreator && (
                          <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">Kurucu</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><Users size={10} />{accepted.length} üye</span>
                        {pendingCount > 0 && <span className="text-yellow-400">{pendingCount} bekliyor</span>}
                        {band.city && <span>· {band.city}</span>}
                      </div>
                    </div>
                  </div>
                  {isCreator && (
                    <button
                      onClick={() => setInvitingBandId(isInviting ? null : band.id)}
                      className={cn('flex items-center gap-1 text-xs px-2 py-1.5 rounded-md transition-colors flex-shrink-0',
                        isInviting ? 'bg-accent/20 text-accent' : 'bg-[rgba(228,224,216,0.06)] text-text-muted hover:text-text-primary'
                      )}
                    >
                      <UserPlus size={12} />
                      Davet Et
                    </button>
                  )}
                </div>

                {accepted.length > 0 && (
                  <div className="flex items-center gap-1 mt-3 flex-wrap">
                    {accepted.slice(0, 7).map((m: any) => (
                      <div key={m.id} title={m.artists?.stage_name ?? ''}
                        className="w-6 h-6 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent text-[9px] font-bold flex-shrink-0">
                        {m.artists?.profiles?.avatar_url ? (
                          <Image src={m.artists.profiles.avatar_url} alt={m.artists.stage_name ?? ''} width={24} height={24} className="object-cover" />
                        ) : m.artists?.stage_name?.[0]}
                      </div>
                    ))}
                    {accepted.length > 7 && <span className="text-text-muted text-xs">+{accepted.length - 7}</span>}
                  </div>
                )}

                {isInviting && (
                  <BandInviteSearch
                    bandId={band.id}
                    existingArtistIds={existingIds}
                    onInvited={load}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
