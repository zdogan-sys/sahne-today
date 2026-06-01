ALTER TABLE teaching_slots ADD COLUMN IF NOT EXISTS payment_enabled bool DEFAULT false;
ALTER TABLE teaching_bookings ADD COLUMN IF NOT EXISTS booked_by text DEFAULT 'student';
ALTER TABLE teaching_bookings ADD COLUMN IF NOT EXISTS confirmation_token uuid DEFAULT uuid_generate_v4();

ALTER TABLE teaching_bookings DROP CONSTRAINT IF EXISTS teaching_bookings_status_check;
ALTER TABLE teaching_bookings ADD CONSTRAINT teaching_bookings_status_check
  CHECK (status IN ('pending','awaiting_student','confirmed','cancelled'));
