CREATE TABLE IF NOT EXISTS studio_availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  room_id uuid REFERENCES studio_rooms(id) ON DELETE CASCADE,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  type text NOT NULL CHECK (type IN ('open', 'closed')) DEFAULT 'open',
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE studio_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Studio availability publicly readable" ON studio_availability
  FOR SELECT USING (is_active = true);

CREATE POLICY "Venue owners manage availability" ON studio_availability
  FOR ALL USING (auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id));

GRANT ALL ON TABLE public.studio_availability TO anon, authenticated, service_role;
