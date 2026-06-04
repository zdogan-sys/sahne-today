-- Aylık (aidat) faturalandırma modeli
-- billing_type: 'package' (toplam ücret, mevcut) | 'monthly' (aylık aidat)

ALTER TABLE venue_lesson_templates ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'package';
ALTER TABLE venue_lesson_templates ADD COLUMN IF NOT EXISTS monthly_price numeric;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'package';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS monthly_price numeric;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_unit text DEFAULT 'weeks'; -- 'weeks' | 'months'
ALTER TABLE courses ADD COLUMN IF NOT EXISTS months int;

ALTER TABLE lesson_requests ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'package';
ALTER TABLE lesson_requests ADD COLUMN IF NOT EXISTS months int;
