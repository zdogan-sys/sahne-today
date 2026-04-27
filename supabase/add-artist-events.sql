-- 1. venue_id nullable (manual events have no linked venue)
alter table public.events alter column venue_id drop not null;

-- 2. Free-text venue name for manual entries
alter table public.events add column if not exists venue_name text;

-- 3. Allow 'pending' status (venue approval flow)
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('confirmed', 'cancelled', 'pending'));

-- 4. RLS: artists can insert events where they are the artist
drop policy if exists "Artists can insert own events" on public.events;
create policy "Artists can insert own events"
  on public.events for insert
  with check (
    artist_id in (
      select id from public.artists where profile_id = auth.uid()
    )
  );

-- 5. RLS: artists can update/delete their own pending events
drop policy if exists "Artists can update own events" on public.events;
create policy "Artists can update own events"
  on public.events for update
  using (
    artist_id in (
      select id from public.artists where profile_id = auth.uid()
    )
  );
