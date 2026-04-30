'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, UserPlus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BandInviteSearch } from './BandInviteSearch'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { HiringBandsSearch } from './HiringBandsSearch'
import { CITY_OPTIONS } from '@/lib/constants'
import { TabbedGenreSelector } from '@/components/ui/TabbedGenreSelector'
import { respondToApplication } from '@/app/actions/band'

interface Props {
  userId: string   // profile id
  artistId: string // artist record id
  lookingForBand: boolean
  onToggleLfb: () => void
}

export function BandSection({ userId, artistId, lookingForBand, onToggleLfb }: Props) {
  const [bands, setBands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
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
        .select('bands(id, name, genres, city, bio, photo_url, creator_id, created_at, band_members(id, artist_id, role, status, artists(id, stage_name, instruments, profiles(avatar_url))))')
        .eq('artist_id', artistId)
        .eq('status', 'accepted'),
      supabase
        .from('bands')
        .select('id, name, genres, city, bio, photo_url, creator_id, created_at, band_members(id, artist_id, role, status, artists(id, stage_name, instruments, profiles(avatar_url)))')
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowSearch(!showSearch); setShowCreate(false) }}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
              showSearch
                ? 'bg-[rgba(228,224,216,0.1)] text-text-primary border-[rgba(228,224,216,0.2)]'
                : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.12)] hover:text-text-primary'
            )}
            title="Eleman Arayan Grupları Bul"
          >
            <Search size={11} />
            Grup Bul
          </button>
          <button
            onClick={onToggleLfb}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
              lookingForBand
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.12)] hover:text-text-primary'
            )}
          >
            <Users size={11} />
            {lookingForBand ? 'Grup arıyorum · Aktif' : 'Grup arıyorum'}
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowSearch(false) }}
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
          >
            <Plus size={15} />
            Grup Kur
          </button>
        </div>
      </div>

      {showSearch && <HiringBandsSearch />}

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
            <TabbedGenreSelector
              label="Müzik Türleri"
              selected={newGenres}
              onToggle={(g) => setNewGenres(newGenres.includes(g) ? newGenres.filter((x) => x !== g) : [...newGenres, g])}
            />
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
            const pendingInvites = (band.members ?? []).filter((m: any) => m.status === 'invited' && m.role !== 'Applicant').length
            const applications = (band.members ?? []).filter((m: any) => m.status === 'invited' && m.role === 'Applicant')
            const existingMembers = (band.members ?? []).map((m: any) => ({
              artist_id: m.artist_id,
              status: m.status,
              role: m.role
            }))
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
                        {applications.length > 0 && isCreator && (
                          <span className="text-yellow-400 font-medium bg-yellow-400/10 px-1.5 py-0.5 rounded">{applications.length} yeni başvuru</span>
                        )}
                        {pendingInvites > 0 && isCreator && (
                          <span className="text-text-muted">{pendingInvites} davet bekliyor</span>
                        )}
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

                {isCreator && applications.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(228,224,216,0.06)] space-y-2">
                    <p className="text-xs font-medium text-text-primary">Gruba Katılmak İsteyenler</p>
                    {applications.map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between gap-3 bg-[rgba(228,224,216,0.03)] p-2 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                            {app.artists?.profiles?.avatar_url ? (
                              <Image src={app.artists.profiles.avatar_url} alt={app.artists.stage_name} width={32} height={32} className="object-cover" />
                            ) : app.artists?.stage_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/artists/${app.artists?.id}`} className="text-sm font-medium text-text-primary hover:text-accent truncate block">
                              {app.artists?.stage_name}
                            </Link>
                            <p className="text-xs text-text-muted truncate">
                              {app.artists?.instruments?.slice(0, 2).join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={async () => {
                              await respondToApplication(app.id, band.id, false)
                              load()
                            }}
                            className="text-[10px] px-2 py-1.5 rounded-md bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                          >
                            Reddet
                          </button>
                          <button
                            onClick={async () => {
                              await respondToApplication(app.id, band.id, true)
                              load()
                            }}
                            className="text-[10px] px-2 py-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            Kabul Et
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isInviting && (
                  <BottomSheet open={isInviting} onClose={() => setInvitingBandId(null)} title="Yeni Üye Davet Et">
                    <BandInviteSearch
                      bandId={band.id}
                      existingMembers={existingMembers}
                      onInvited={load}
                    />
                  </BottomSheet>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
