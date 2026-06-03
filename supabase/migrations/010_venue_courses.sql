-- teaching_slots'a venue_id, instructor_name ekle, artist_id nullable yap
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES venues(id) ON DELETE CASCADE;
ALTER TABLE teaching_slots ALTER COLUMN artist_id DROP NOT NULL;
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS instructor_name text;

-- Venue instructors tablosu
CREATE TABLE IF NOT EXISTS venue_instructors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  name text NOT NULL,
  instruments text[] DEFAULT '{}',
  bio text,
  photo_url text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE venue_instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Venue instructors are publicly readable" ON venue_instructors;
CREATE POLICY "Venue instructors are publicly readable" ON venue_instructors
  FOR SELECT USING (is_active = true OR auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id));

DROP POLICY IF EXISTS "Venue owners manage instructors" ON venue_instructors;
CREATE POLICY "Venue owners manage instructors" ON venue_instructors
  FOR ALL USING (auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id));

-- Table-level grants (self-hosted Supabase için gerekli)
GRANT SELECT, INSERT, UPDATE, DELETE ON venue_instructors TO authenticated;
GRANT SELECT ON venue_instructors TO anon;

-- teaching_slots RLS: artist VEYA venue owner erişimi
DROP POLICY IF EXISTS "Artists manage own teaching slots" ON teaching_slots;

CREATE POLICY "Teaching slot owners manage" ON teaching_slots
  FOR ALL USING (
    (artist_id IS NOT NULL AND auth.uid() = (SELECT profile_id FROM artists WHERE id = artist_id))
    OR
    (venue_id IS NOT NULL AND auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id))
  );

-- teaching_bookings RLS: venue_id de erişebilsin
DROP POLICY IF EXISTS "Teachers manage bookings" ON teaching_bookings;

CREATE POLICY "Slot owners manage bookings" ON teaching_bookings
  FOR ALL USING (
    artist_id IS NOT NULL AND auth.uid() = (SELECT profile_id FROM artists WHERE id = artist_id)
    OR
    artist_id IS NULL AND auth.uid() = (
      SELECT owner_id FROM venues WHERE id = (SELECT venue_id FROM teaching_slots WHERE id = slot_id)
    )
  );

-- courses RLS: venue_id de erişebilsin
DROP POLICY IF EXISTS "Instructors manage courses" ON courses;

CREATE POLICY "Instructors manage courses" ON courses
  FOR ALL USING (
    auth.uid() = (SELECT profile_id FROM artists WHERE id = instructor_id)
    OR
    (venue_id IS NOT NULL AND auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id))
  );
