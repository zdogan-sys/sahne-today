alter table public.artists add column if not exists social_links jsonb default '{}'::jsonb;
alter table public.venues  add column if not exists social_links jsonb default '{}'::jsonb;
