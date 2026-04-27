alter table public.artists add column if not exists looking_for_band boolean default false;
alter table public.artists add column if not exists lfb_note text;
