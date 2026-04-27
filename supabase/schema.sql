-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('artist', 'venue', 'audience')),
  display_name text not null,
  avatar_url text,
  city text,
  bio text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Venues
create table public.venues (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  city text not null,
  district text not null,
  address text not null,
  phone text,
  email text,
  venue_type text not null check (venue_type in ('pub', 'turku_bar', 'live_music', 'bookstore', 'theater', 'cafe', 'other')),
  description text,
  photo_url text,
  capacity_seated integer,
  capacity_standing integer,
  stage_area_m2 integer,
  equipment text[] default '{}',
  genres text[] default '{}',
  verified boolean default false,
  created_at timestamptz default now() not null
);

alter table public.venues enable row level security;

create policy "Venues are viewable by everyone" on public.venues for select using (true);
create policy "Venue owners can insert" on public.venues for insert with check (auth.uid() = owner_id);
create policy "Venue owners can update" on public.venues for update using (auth.uid() = owner_id);
create policy "Venue owners can delete" on public.venues for delete using (auth.uid() = owner_id);

-- Slots
create table public.slots (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  recurrence text not null check (recurrence in ('weekly', 'biweekly', 'once')),
  fee_model text not null check (fee_model in ('free', 'door_share', 'guarantee', 'negotiable')),
  fee_value numeric,
  max_performers integer,
  status text not null default 'open' check (status in ('open', 'pending', 'booked')),
  notes text,
  created_at timestamptz default now() not null
);

alter table public.slots enable row level security;

create policy "Slots are viewable by everyone" on public.slots for select using (true);
create policy "Venue owners can manage slots" on public.slots for insert with check (
  auth.uid() = (select owner_id from public.venues where id = venue_id)
);
create policy "Venue owners can update slots" on public.slots for update using (
  auth.uid() = (select owner_id from public.venues where id = venue_id)
);
create policy "Venue owners can delete slots" on public.slots for delete using (
  auth.uid() = (select owner_id from public.venues where id = venue_id)
);

-- Artists
create table public.artists (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  stage_name text not null,
  genres text[] default '{}',
  instruments text[] default '{}',
  city text,
  bio text,
  video_urls text[] default '{}',
  technical_rider text,
  past_venues text[] default '{}',
  verified boolean default false,
  created_at timestamptz default now() not null
);

alter table public.artists enable row level security;

create policy "Artists are viewable by everyone" on public.artists for select using (true);
create policy "Artists can insert their profile" on public.artists for insert with check (auth.uid() = profile_id);
create policy "Artists can update their profile" on public.artists for update using (auth.uid() = profile_id);

-- Applications
create table public.applications (
  id uuid primary key default uuid_generate_v4(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now() not null,
  unique(slot_id, artist_id)
);

alter table public.applications enable row level security;

create policy "Artists can view their own applications" on public.applications for select using (
  auth.uid() = (select profile_id from public.artists where id = artist_id)
);
create policy "Venue owners can view applications for their slots" on public.applications for select using (
  auth.uid() = (select v.owner_id from public.venues v join public.slots s on s.venue_id = v.id where s.id = slot_id)
);
create policy "Artists can apply" on public.applications for insert with check (
  auth.uid() = (select profile_id from public.artists where id = artist_id)
);
create policy "Venue owners can update application status" on public.applications for update using (
  auth.uid() = (select v.owner_id from public.venues v join public.slots s on s.venue_id = v.id where s.id = slot_id)
);

-- Events
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  slot_id uuid references public.slots(id),
  title text not null,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  genre text,
  entry_fee numeric,
  entry_type text not null default 'free' check (entry_type in ('free', 'paid', 'door')),
  description text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz default now() not null
);

alter table public.events enable row level security;

create policy "Events are viewable by everyone" on public.events for select using (true);
create policy "Venue owners can create events" on public.events for insert with check (
  auth.uid() = (select owner_id from public.venues where id = venue_id)
);
create policy "Venue owners can update events" on public.events for update using (
  auth.uid() = (select owner_id from public.venues where id = venue_id)
);

-- Crew listings
create table public.crew_listings (
  id uuid primary key default uuid_generate_v4(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  genres text[] default '{}',
  roles_needed text[] default '{}',
  city text,
  contact_email text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now() not null
);

alter table public.crew_listings enable row level security;

create policy "Crew listings are viewable by everyone" on public.crew_listings for select using (true);
create policy "Users can create crew listings" on public.crew_listings for insert with check (auth.uid() = poster_id);
create policy "Users can manage their crew listings" on public.crew_listings for update using (auth.uid() = poster_id);
create policy "Users can delete their crew listings" on public.crew_listings for delete using (auth.uid() = poster_id);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'audience')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Realtime
alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.events;
