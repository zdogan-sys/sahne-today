-- Allow events without a linked artist (venue-initiated entries)
alter table public.events alter column artist_id drop not null;
alter table public.events add column if not exists artist_name text;

-- RLS: venue owners can insert events for their venues
drop policy if exists "Venue owners can insert events" on public.events;
create policy "Venue owners can insert events"
  on public.events for insert
  with check (
    venue_id in (
      select id from public.venues where owner_id = auth.uid()
    )
  );

-- RLS: venue owners can update events for their venues
drop policy if exists "Venue owners can update events" on public.events;
create policy "Venue owners can update events"
  on public.events for update
  using (
    venue_id in (
      select id from public.venues where owner_id = auth.uid()
    )
  );
