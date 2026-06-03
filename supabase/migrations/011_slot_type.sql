-- Add slot_type column to teaching_slots
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS slot_type text DEFAULT 'lesson';

-- Allow 'lesson' and 'closed' values
-- 'lesson' = normal teaching slot
-- 'closed' = lunch break, time off, unavailable period
