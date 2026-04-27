alter table public.bands add column if not exists video_urls text[] default '{}';
