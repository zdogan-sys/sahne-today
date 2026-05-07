CREATE TABLE IF NOT EXISTS follows (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('artist', 'band', 'venue')),
  target_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own follows" ON follows
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public read follows" ON follows
  FOR SELECT USING (true);
