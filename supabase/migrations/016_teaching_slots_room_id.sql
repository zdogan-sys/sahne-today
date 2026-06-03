-- Add room_id to teaching_slots table
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES studio_rooms(id) ON DELETE SET NULL;
