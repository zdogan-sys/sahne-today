-- Allow events without a linked venue (manual entries)
alter table public.events alter column venue_id drop not null;
alter table public.events add column if not exists venue_name text;
