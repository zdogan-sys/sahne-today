-- Studio odaları tablosu
CREATE TABLE IF NOT EXISTS studio_rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_per_hour numeric,
  capacity int DEFAULT 1,
  equipment text[] DEFAULT '{}',
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE studio_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Studio rooms publicly readable" ON studio_rooms
  FOR SELECT USING (is_active = true OR auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id));

CREATE POLICY "Venue owners manage rooms" ON studio_rooms
  FOR ALL USING (auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id));

GRANT ALL ON TABLE public.studio_rooms TO anon, authenticated, service_role;

-- studio_reservations'a room_id ekle
ALTER TABLE studio_reservations ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES studio_rooms(id) ON DELETE SET NULL;
ALTER TABLE studio_reservations ADD COLUMN IF NOT EXISTS room_name text;
