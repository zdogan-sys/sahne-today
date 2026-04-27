-- Add event_type to slots
alter table public.slots add column if not exists event_type text default 'Konser';

-- Add event_date and band_id to applications
alter table public.applications add column if not exists event_date date;
alter table public.applications add column if not exists band_id uuid references public.bands(id) on delete set null;

-- Drop old unique constraint (slot_id, artist_id) and replace with (slot_id, artist_id, event_date)
alter table public.applications drop constraint if exists applications_slot_id_artist_id_key;
alter table public.applications add constraint applications_slot_artist_date_key unique (slot_id, artist_id, event_date);

-- Add band_id to events
alter table public.events add column if not exists band_id uuid references public.bands(id) on delete set null;
