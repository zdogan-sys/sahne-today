ALTER TABLE artists ADD COLUMN IF NOT EXISTS is_teaching bool default false;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS teaching_instruments text[] default '{}';
