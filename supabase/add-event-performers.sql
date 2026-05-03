-- event_performers: çok katılımcılı etkinlik desteği
CREATE TABLE IF NOT EXISTS event_performers (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  artist_id   uuid REFERENCES artists(id) ON DELETE SET NULL,
  band_id     uuid REFERENCES bands(id)   ON DELETE SET NULL,
  role        text,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT has_one_performer CHECK (
    (artist_id IS NOT NULL)::int + (band_id IS NOT NULL)::int = 1
  )
);

ALTER TABLE event_performers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes görebilir"   ON event_performers FOR SELECT USING (true);
CREATE POLICY "Admin yönetebilir"  ON event_performers FOR ALL   USING (true) WITH CHECK (true);
