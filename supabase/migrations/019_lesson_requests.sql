-- Public ders talepleri (grup/özel) — öğrenci oluşturur, venue sahibi onaylar
CREATE TABLE IF NOT EXISTS lesson_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  template_id uuid REFERENCES venue_lesson_templates(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type IN ('private','group')),
  requested_date date,            -- özel ders için
  requested_time time,            -- özel ders için
  preferred_instructor text,      -- opsiyonel
  student_id uuid REFERENCES profiles(id),
  student_name text NOT NULL,
  student_email text NOT NULL,
  student_phone text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lesson_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can request" ON lesson_requests;
CREATE POLICY "Anyone can request" ON lesson_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Venue owner manages requests" ON lesson_requests;
CREATE POLICY "Venue owner manages requests" ON lesson_requests FOR ALL USING (
  auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id)
);

-- Table-level grants (self-hosted Supabase için gerekli)
-- service_role: admin client (API) bu tabloya yazıyor, mutlaka gerekli
GRANT ALL ON lesson_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_requests TO authenticated;
GRANT INSERT ON lesson_requests TO anon;
