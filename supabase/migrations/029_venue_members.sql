-- 029_venue_members.sql: Mekan çok-üye yönetimi
-- Bir mekanı birden fazla kişi yönetebilir: owner (kurucu, tek) + manager (eklenebilir)

-- 1. venue_members tablosu
CREATE TABLE IF NOT EXISTS venue_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager')),
  invited_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (venue_id, user_id)
);

-- 2. Mevcut owner_id sahiplerini tabloya geçir
INSERT INTO venue_members (venue_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM venues
WHERE owner_id IS NOT NULL
ON CONFLICT (venue_id, user_id) DO NOTHING;

-- 3. Trigger: yeni mekan oluşturulduğunda / owner_id güncellendiğinde otomatik üye ekle
CREATE OR REPLACE FUNCTION sync_venue_owner_to_members()
RETURNS trigger AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO venue_members (venue_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (venue_id, user_id) DO UPDATE SET role = 'owner';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_venue_owner_sync ON venues;
CREATE TRIGGER trg_venue_owner_sync
AFTER INSERT OR UPDATE OF owner_id ON venues
FOR EACH ROW EXECUTE FUNCTION sync_venue_owner_to_members();

-- 4. Yardımcı fonksiyonlar (SECURITY DEFINER → RLS sonsuz döngüsünü önler)
CREATE OR REPLACE FUNCTION get_venue_member_role(p_venue_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM venue_members WHERE venue_id = p_venue_id AND user_id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_venue_member(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM venue_members WHERE venue_id = p_venue_id AND user_id = auth.uid()
  );
$$;

-- 5. venue_members için RLS
ALTER TABLE venue_members ENABLE ROW LEVEL SECURITY;

-- Üyeler kendi mekanlarının tüm üyelerini görebilir
CREATE POLICY "Members see their venue members" ON venue_members
  FOR SELECT USING (get_venue_member_role(venue_id, auth.uid()) IS NOT NULL);

-- Sadece owner üye ekleyebilir / kaldırabilir
CREATE POLICY "Owners manage members" ON venue_members
  FOR ALL USING (get_venue_member_role(venue_id, auth.uid()) = 'owner');

-- 6. Grant'ler (self-hosted Supabase otomatik vermez)
GRANT SELECT, INSERT, UPDATE, DELETE ON venue_members TO authenticated;
GRANT SELECT ON venue_members TO anon;
GRANT ALL ON venue_members TO service_role;

-- 7. Mevcut RLS policy'lerini owner_id yerine is_venue_member() kullanacak şekilde güncelle

-- studio_reservations
DROP POLICY IF EXISTS "Reservations viewable by owner" ON studio_reservations;
CREATE POLICY "Reservations viewable by owner" ON studio_reservations
  FOR SELECT USING (auth.uid() = reserver_id OR is_venue_member(venue_id));

-- venue_instructors
DROP POLICY IF EXISTS "Venue instructors are publicly readable" ON venue_instructors;
CREATE POLICY "Venue instructors are publicly readable" ON venue_instructors
  FOR SELECT USING (is_active = true OR is_venue_member(venue_id));

DROP POLICY IF EXISTS "Venue owners manage instructors" ON venue_instructors;
CREATE POLICY "Venue owners manage instructors" ON venue_instructors
  FOR ALL USING (is_venue_member(venue_id));

-- teaching_slots
DROP POLICY IF EXISTS "Teaching slot owners manage" ON teaching_slots;
CREATE POLICY "Teaching slot owners manage" ON teaching_slots
  FOR ALL USING (
    (artist_id IS NOT NULL AND auth.uid() = (SELECT profile_id FROM artists WHERE id = artist_id))
    OR (venue_id IS NOT NULL AND is_venue_member(venue_id))
  );

-- teaching_bookings
DROP POLICY IF EXISTS "Slot owners manage bookings" ON teaching_bookings;
CREATE POLICY "Slot owners manage bookings" ON teaching_bookings
  FOR ALL USING (
    (artist_id IS NOT NULL AND auth.uid() = (SELECT profile_id FROM artists WHERE id = artist_id))
    OR (artist_id IS NULL AND is_venue_member(
      (SELECT venue_id FROM teaching_slots WHERE id = slot_id)
    ))
  );

-- courses
DROP POLICY IF EXISTS "Instructors manage courses" ON courses;
CREATE POLICY "Instructors manage courses" ON courses
  FOR ALL USING (
    auth.uid() = (SELECT profile_id FROM artists WHERE id = instructor_id)
    OR (venue_id IS NOT NULL AND is_venue_member(venue_id))
  );

-- studio_rooms
DROP POLICY IF EXISTS "Studio rooms publicly readable" ON studio_rooms;
CREATE POLICY "Studio rooms publicly readable" ON studio_rooms
  FOR SELECT USING (is_active = true OR is_venue_member(venue_id));

DROP POLICY IF EXISTS "Venue owners manage rooms" ON studio_rooms;
CREATE POLICY "Venue owners manage rooms" ON studio_rooms
  FOR ALL USING (is_venue_member(venue_id));

-- studio_availability
DROP POLICY IF EXISTS "Venue owners manage availability" ON studio_availability;
CREATE POLICY "Venue owners manage availability" ON studio_availability
  FOR ALL USING (is_venue_member(venue_id));

-- venue_lesson_templates
DROP POLICY IF EXISTS "Owner manage" ON venue_lesson_templates;
CREATE POLICY "Owner manage" ON venue_lesson_templates
  FOR ALL USING (is_venue_member(venue_id));

-- lesson_requests
DROP POLICY IF EXISTS "Venue owner manages requests" ON lesson_requests;
CREATE POLICY "Venue owner manages requests" ON lesson_requests
  FOR ALL USING (is_venue_member(venue_id));

-- aidat_payments
DROP POLICY IF EXISTS "Venue owner manages aidat" ON aidat_payments;
CREATE POLICY "Venue owner manages aidat" ON aidat_payments
  FOR ALL USING (is_venue_member(venue_id));

-- venues güncelleme (üyeler mekan bilgilerini düzenleyebilir)
DROP POLICY IF EXISTS "Venue owner update" ON venues;
DROP POLICY IF EXISTS "Venue members update" ON venues;
CREATE POLICY "Venue members update" ON venues
  FOR UPDATE USING (is_venue_member(id));
