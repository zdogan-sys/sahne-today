-- Allow 'pending' status for venue-approval flow on manually created events
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('confirmed', 'cancelled', 'pending'));
