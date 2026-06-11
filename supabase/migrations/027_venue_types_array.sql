-- Add venue_types array column for multi-type support
ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_types text[] DEFAULT '{}';

-- Backfill existing rows: primary type goes into the array
UPDATE venues SET venue_types = ARRAY[venue_type] WHERE venue_types IS NULL OR venue_types = '{}';
