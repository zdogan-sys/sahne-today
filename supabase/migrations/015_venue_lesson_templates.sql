-- Create venue_lesson_templates table
CREATE TABLE IF NOT EXISTS venue_lesson_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,                    -- "Klasik Gitar Kursu"
  subject text,                          -- "Gitar"
  weeks int NOT NULL DEFAULT 4,
  hours_per_session numeric NOT NULL DEFAULT 1,
  price_total numeric NOT NULL DEFAULT 0,
  description text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE venue_lesson_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read" ON venue_lesson_templates;
CREATE POLICY "Public read" ON venue_lesson_templates
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owner manage" ON venue_lesson_templates;
CREATE POLICY "Owner manage" ON venue_lesson_templates
  FOR ALL USING (auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id));

-- Table-level grants (self-hosted Supabase için gerekli)
GRANT SELECT, INSERT, UPDATE, DELETE ON venue_lesson_templates TO authenticated;
GRANT SELECT ON venue_lesson_templates TO anon;
