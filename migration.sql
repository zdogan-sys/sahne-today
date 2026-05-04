ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price numeric default 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_count int default 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_sold int default 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticketing_enabled bool default false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS commission_rate numeric default 8;

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  buyer_name text not null,
  buyer_surname text not null,
  buyer_email text not null,
  buyer_phone text not null,
  quantity int default 1,
  unit_price numeric not null,
  total_price numeric not null,
  qr_code text unique,
  status text check (status in ('pending','paid','used','cancelled')) default 'pending',
  paytr_order_id text unique,
  created_at timestamptz default now()
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venue owners can view tickets" ON tickets FOR SELECT USING (
  auth.uid() = (SELECT owner_id FROM venues v JOIN events e ON e.venue_id = v.id WHERE e.id = event_id)
);

CREATE TABLE IF NOT EXISTS ticket_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid references tickets(id),
  paytr_order_id text,
  amount numeric,
  status text check (status in ('pending','success','failed')),
  paytr_response jsonb,
  created_at timestamptz default now()
);
