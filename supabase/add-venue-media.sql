alter table public.venues add column if not exists video_urls text[] default '{}';
