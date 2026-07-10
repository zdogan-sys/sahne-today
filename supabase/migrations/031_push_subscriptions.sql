-- 031: Web push abonelikleri
-- Kullanıcının tarayıcı push aboneliği (bir kullanıcının birden fazla
-- cihazı/tarayıcısı olabilir; endpoint benzersizdir).

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Herkes yalnızca kendi aboneliklerini yönetir; okuma/gönderim service role ile
create policy "push_subs_own_all" on public.push_subscriptions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);
