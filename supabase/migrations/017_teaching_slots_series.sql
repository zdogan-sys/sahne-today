-- Add series_id to group lesson slots (same course series across weeks)
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS series_id uuid;
