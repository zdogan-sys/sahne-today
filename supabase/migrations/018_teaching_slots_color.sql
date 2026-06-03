-- Add color_index to lessons (per course/series color, independent of day)
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS color_index int;
