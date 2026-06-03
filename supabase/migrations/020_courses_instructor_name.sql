-- Kurslara serbest eğitmen adı (venue_instructors'tan seçilebilir, profil zorunlu değil)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name text;
