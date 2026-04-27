-- Bands (groups)
create table if not exists public.bands (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  genres text[] default '{}',
  city text,
  bio text,
  photo_url text,
  social_links jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.bands enable row level security;

create policy "bands_public_select"   on public.bands for select using (true);
create policy "bands_creator_insert"  on public.bands for insert with check (auth.uid() = creator_id);
create policy "bands_creator_update"  on public.bands for update using (auth.uid() = creator_id);
create policy "bands_creator_delete"  on public.bands for delete using (auth.uid() = creator_id);

-- Band memberships / invitations
create table if not exists public.band_members (
  id uuid primary key default uuid_generate_v4(),
  band_id uuid not null references public.bands(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  role text,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  invited_at timestamptz default now() not null,
  joined_at timestamptz,
  unique(band_id, artist_id)
);

alter table public.band_members enable row level security;

create policy "band_members_public_select" on public.band_members for select using (true);

-- band creator sends invitations
create policy "band_members_creator_insert" on public.band_members for insert with check (
  auth.uid() = (select creator_id from public.bands where id = band_id)
);

-- invited artist accepts or declines
create policy "band_members_artist_update" on public.band_members for update using (
  auth.uid() = (select profile_id from public.artists where id = artist_id)
);

-- band creator can remove members
create policy "band_members_creator_delete" on public.band_members for delete using (
  auth.uid() = (select creator_id from public.bands where id = band_id)
);

alter publication supabase_realtime add table public.band_members;
