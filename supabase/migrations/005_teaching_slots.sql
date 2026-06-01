CREATE TABLE IF NOT EXISTS teaching_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id uuid REFERENCES artists(id) ON DELETE CASCADE,
  instrument text NOT NULL,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  recurrence text CHECK (recurrence IN ('weekly','biweekly')) DEFAULT 'weekly',
  price_per_session numeric NOT NULL,
  currency text DEFAULT 'TRY',
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teaching_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teaching slots viewable by everyone" ON teaching_slots FOR SELECT USING (is_active = true);
CREATE POLICY "Artists manage own teaching slots" ON teaching_slots FOR ALL USING (
  auth.uid() = (SELECT profile_id FROM artists WHERE id = artist_id)
);

CREATE TABLE IF NOT EXISTS teaching_bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id uuid REFERENCES teaching_slots(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id),
  student_id uuid REFERENCES profiles(id),
  student_name text NOT NULL,
  student_email text NOT NULL,
  student_phone text NOT NULL,
  lesson_date date NOT NULL,
  status text CHECK (status IN ('pending','confirmed','cancelled')) DEFAULT 'pending',
  payment_status text CHECK (payment_status IN ('pending','paid','refunded')) DEFAULT 'pending',
  paytr_order_id text,
  amount_paid numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teaching_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own bookings" ON teaching_bookings FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Artists view their bookings" ON teaching_bookings FOR SELECT USING (
  auth.uid() = (SELECT profile_id FROM artists WHERE id = artist_id)
);
CREATE POLICY "Anyone can book" ON teaching_bookings FOR INSERT WITH CHECK (true);
