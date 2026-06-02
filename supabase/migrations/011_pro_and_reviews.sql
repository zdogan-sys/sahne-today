-- Pro üyelik satın alma tablosu
CREATE TABLE IF NOT EXISTS pro_purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('individual', 'venue')),
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  merchant_oid text UNIQUE,
  amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pro_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own purchases" ON pro_purchases FOR SELECT USING (auth.uid() = user_id);

-- Değerlendirme (reviews) tablosu
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Neyi değerlendiriyorsa sadece biri dolu olur
  artist_id uuid REFERENCES artists(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  -- İçerik
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  -- Kaynak booking (opsiyonel, doğrulama için)
  booking_id uuid REFERENCES teaching_bookings(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES course_enrollments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  -- Her kullanıcı aynı hedefe bir kez yorum yapabilir
  UNIQUE (reviewer_id, artist_id),
  UNIQUE (reviewer_id, venue_id),
  UNIQUE (reviewer_id, course_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews publicly readable" ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users edit own reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Users delete own reviews" ON reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- course_enrollments tablosunda student_email yoksa ekle
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS student_email text;

-- Hatırlatma maili için
ALTER TABLE teaching_bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Kurs doluluğunu otomatik güncelleyen trigger
CREATE OR REPLACE FUNCTION update_course_status()
RETURNS trigger AS $$
DECLARE
  enrolled_count int;
  max_cap int;
BEGIN
  SELECT COUNT(*) INTO enrolled_count
  FROM course_enrollments
  WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    AND status = 'confirmed';

  SELECT max_participants INTO max_cap
  FROM courses
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);

  IF enrolled_count >= max_cap THEN
    UPDATE courses SET status = 'full' WHERE id = COALESCE(NEW.course_id, OLD.course_id) AND status = 'active';
  ELSE
    UPDATE courses SET status = 'active' WHERE id = COALESCE(NEW.course_id, OLD.course_id) AND status = 'full';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_enrollment_change ON course_enrollments;
CREATE TRIGGER on_enrollment_change
  AFTER INSERT OR UPDATE OR DELETE ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_course_status();
