-- 030: Slot görünürlüğü + sanatçı/grup müsaitlik slotları
-- 1) Mekan slotları artık herkese açık değil: mekan sahibi ve mekanı takip
--    eden sanatçı/grup sahipleri görebilir.
-- 2) performer_slots: sanatçı/grupların "bu tarihte müsaitim" ilanları;
--    sadece o sanatçı/grubu takip eden mekan sahipleri görebilir.

-- ── 1) Mekan slotu görünürlüğü ─────────────────────────────────────────────
drop policy if exists "Slots are viewable by everyone" on public.slots;

create policy "Slots visible to owner and following performers" on public.slots
for select using (
  auth.uid() = (select owner_id from public.venues where id = venue_id)
  or (
    exists (
      select 1 from public.follows f
      where f.user_id = auth.uid()
        and f.target_type = 'venue'
        and f.target_id = slots.venue_id
    )
    and (
      exists (select 1 from public.artists a where a.profile_id = auth.uid())
      or exists (select 1 from public.bands b where b.creator_id = auth.uid())
    )
  )
);

-- ── 2) Sanatçı/grup müsaitlik slotları ─────────────────────────────────────
create table if not exists public.performer_slots (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references public.artists(id) on delete cascade,
  band_id uuid references public.bands(id) on delete cascade,
  slot_date date not null,
  start_time time,
  end_time time,
  fee_model text not null default 'negotiable'
    check (fee_model in ('free', 'door_share', 'guarantee', 'negotiable')),
  fee_value numeric,
  notes text,
  status text not null default 'open' check (status in ('open', 'booked', 'closed')),
  created_at timestamptz default now() not null,
  -- sanatçı veya grup slotu; ikisi birden değil
  check (
    (artist_id is not null and band_id is null)
    or (artist_id is null and band_id is not null)
  )
);

create index if not exists idx_performer_slots_artist on public.performer_slots(artist_id);
create index if not exists idx_performer_slots_band on public.performer_slots(band_id);
create index if not exists idx_performer_slots_date on public.performer_slots(slot_date);

alter table public.performer_slots enable row level security;

-- Sahibi (sanatçı profili / grup kurucusu) her şeyi yapabilir
create policy "performer_slots_owner_all" on public.performer_slots
for all using (
  (artist_id is not null and auth.uid() = (select profile_id from public.artists where id = artist_id))
  or (band_id is not null and auth.uid() = (select creator_id from public.bands where id = band_id))
)
with check (
  (artist_id is not null and auth.uid() = (select profile_id from public.artists where id = artist_id))
  or (band_id is not null and auth.uid() = (select creator_id from public.bands where id = band_id))
);

-- Sanatçı/grubu takip eden mekan sahipleri görebilir
create policy "performer_slots_following_venue_select" on public.performer_slots
for select using (
  exists (select 1 from public.venues v where v.owner_id = auth.uid())
  and (
    (artist_id is not null and exists (
      select 1 from public.follows f
      where f.user_id = auth.uid() and f.target_type = 'artist' and f.target_id = performer_slots.artist_id
    ))
    or (band_id is not null and exists (
      select 1 from public.follows f
      where f.user_id = auth.uid() and f.target_type = 'band' and f.target_id = performer_slots.band_id
    ))
  )
);
