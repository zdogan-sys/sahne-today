-- Kullanıcı başına sohbet gizleme (veri silinmez, sadece listeden çıkar)
CREATE TABLE IF NOT EXISTS conversation_hides (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hidden_at       timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (conversation_id, profile_id)
);

ALTER TABLE conversation_hides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hides_select" ON conversation_hides;
DROP POLICY IF EXISTS "hides_insert" ON conversation_hides;
DROP POLICY IF EXISTS "hides_delete" ON conversation_hides;

CREATE POLICY "hides_select" ON conversation_hides FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "hides_insert" ON conversation_hides FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "hides_delete" ON conversation_hides FOR DELETE USING (profile_id = auth.uid());
