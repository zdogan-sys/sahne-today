-- Aylık ders şablonlarında haftada kaç gün ders yapılacağı
ALTER TABLE venue_lesson_templates ADD COLUMN IF NOT EXISTS days_per_week int;
