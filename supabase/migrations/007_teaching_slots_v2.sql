ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS slot_date date;
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS is_online bool DEFAULT false;
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS lesson_type text CHECK (lesson_type IN ('individual','group')) DEFAULT 'individual';
ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS max_participants int DEFAULT 1;
