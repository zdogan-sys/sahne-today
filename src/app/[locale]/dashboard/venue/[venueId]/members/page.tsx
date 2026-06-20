'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, X, Loader2, Crown, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function VenueMembersPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: myRole } = await supabase
      .from('venue_members')
      .select('role')
      .eq('venue_id', venueId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!myRole || myRole.role !== 'owner') { router.push('/dashboard'); return }

    const [venueRes, membersRes] = await Promise.all([
      supabase.from('venues').select('id, name').eq('id', venueId).single(),
      supabase
        .from('venue_members')
        .select('id, role, created_at, profiles:user_id(id, display_name, avatar_url)')
        .eq('venue_id', venueId)
        .order('created_at'),
    ])

    setVenue(venueRes.data)
    setMembers(membersRes.data ?? [])
    setLoading(false)
  }

  function handleSearch(q: string) {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 2) { setSearchResults([]); return }
    searchTimer.current = setTimeout(() => doSearch(q), 300)
  }

  async function doSearch(q: string) {
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${q}%`)
      .limit(10)
    const existingIds = new Set(members.map((m: any) => (m.profiles as any)?.id))
    setSearchResults((data ?? []).filter((p: any) => !existingIds.has(p.id)))
    setSearching(false)
  }

  async function addMember(profileId: string, displayName: string) {
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('venue_members')
      .insert({ venue_id: venueId, user_id: profileId, role: 'manager' })
    if (err) { setError(err.message); setSaving(false); return }
    setSearchQuery('')
    setSearchResults([])
    await load()
    setSaving(false)
  }

  async function removeMember(memberId: string) {
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('venue_members')
      .delete()
      .eq('id', memberId)
    if (err) { setError(err.message); setSaving(false); return }
    await load()
    setSaving(false)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
      <Loader2 size={24} className="animate-spin text-accent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href={`/dashboard/venue/${venueId}`} className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> {venue?.name}
        </Link>
        <h1 className="font-bebas text-3xl text-text-primary">MEKAN ÜYELERİ</h1>
        <p className="text-text-muted text-sm mt-1">Mekanı birlikte yönetmek istediğiniz kullanıcıları ekleyin.</p>
      </div>

      {/* Kullanıcı arama */}
      <div className="space-y-2">
        <label className="label text-sm">Yönetici Ekle</label>
        <div className="relative">
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Kullanıcı adıyla ara..."
            className="input-field w-full pr-8"
          />
          {searching && <Loader2 size={14} className="animate-spin text-text-muted absolute right-3 top-1/2 -translate-y-1/2" />}
        </div>

        {searchResults.length > 0 && (
          <div className="card divide-y divide-[rgba(228,224,216,0.1)]">
            {searchResults.map((profile: any) => (
              <div key={profile.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    : <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center"><User size={12} className="text-accent" /></div>
                  }
                  <span className="text-text-primary text-sm">{profile.display_name}</span>
                </div>
                <button
                  onClick={() => addMember(profile.id, profile.display_name)}
                  disabled={saving}
                  className="btn-accent py-1 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <UserPlus size={12} /> Ekle
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
          <p className="text-text-muted text-xs">Kullanıcı bulunamadı.</p>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {/* Mevcut üyeler */}
      <div className="space-y-3">
        <h2 className="text-text-primary font-semibold text-sm">
          Mevcut Üyeler ({members.length})
        </h2>
        <div className="card divide-y divide-[rgba(228,224,216,0.1)]">
          {members.map((member: any) => {
            const profile = member.profiles as any
            const isOwnerMember = member.role === 'owner'
            return (
              <div key={member.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"><User size={14} className="text-accent" /></div>
                  }
                  <div>
                    <p className="text-text-primary text-sm">{profile?.display_name ?? '—'}</p>
                    {isOwnerMember
                      ? <span className="flex items-center gap-1 text-accent text-[10px] mt-0.5"><Crown size={9} /> Kurucu</span>
                      : <span className="text-text-muted text-[10px] mt-0.5 block">Yönetici</span>
                    }
                  </div>
                </div>
                {!isOwnerMember && (
                  <button
                    onClick={() => removeMember(member.id)}
                    disabled={saving}
                    className="p-1.5 text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Kaldır"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
