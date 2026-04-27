alter table public.venues add column if not exists photos text[] default '{}';
