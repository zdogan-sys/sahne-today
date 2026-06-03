-- Özel (şablonsuz) ders istekleri için öğrencinin belirlediği alanlar
ALTER TABLE lesson_requests ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE lesson_requests ADD COLUMN IF NOT EXISTS weeks int;
ALTER TABLE lesson_requests ADD COLUMN IF NOT EXISTS hours_per_session numeric;
