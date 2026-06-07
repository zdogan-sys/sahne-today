-- Mekan koordinatları (harita + "civarda ne var" filtresi için)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS longitude double precision;

-- Yakınlık sorgularını hızlandırmak için indeks
CREATE INDEX IF NOT EXISTS idx_venues_lat_lng ON venues (latitude, longitude);
