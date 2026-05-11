-- Feature flags (premium gating infrastructure)
CREATE TABLE IF NOT EXISTS feature_flags (
  key text PRIMARY KEY,
  enabled boolean DEFAULT false NOT NULL,
  description text
);

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('messaging_premium_required', false, 'Mesajlaşma özelliğini sadece premium üyelere açar')
ON CONFLICT (key) DO NOTHING;

-- Premium status on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false NOT NULL;

-- Conversations: one per (type, context) — band group chat or event thread
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('band', 'event')),
  context_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_message_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (type, context_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Unread tracking: last time each user read a conversation
CREATE TABLE IF NOT EXISTS conversation_reads (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (conversation_id, profile_id)
);

-- ── Helper functions (SECURITY DEFINER so RLS can call them) ─────────────────

CREATE OR REPLACE FUNCTION is_band_conversation_member(p_band_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    -- Grup kurucusu
    SELECT 1 FROM bands WHERE id = p_band_id AND creator_id = p_user_id
    UNION ALL
    -- Kabul edilmiş üye
    SELECT 1 FROM band_members bm
    JOIN artists a ON a.id = bm.artist_id
    WHERE bm.band_id = p_band_id
      AND bm.status = 'accepted'
      AND a.profile_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_event_conversation_participant(p_event_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e
    JOIN venues v ON v.id = e.venue_id
    WHERE e.id = p_event_id AND v.owner_id = p_user_id
    UNION ALL
    SELECT 1 FROM event_performers ep
    JOIN artists a ON a.id = ep.artist_id
    WHERE ep.event_id = p_event_id AND a.profile_id = p_user_id
    UNION ALL
    SELECT 1 FROM event_performers ep
    JOIN band_members bm ON bm.band_id = ep.band_id
    JOIN artists a ON a.id = bm.artist_id
    WHERE ep.event_id = p_event_id
      AND bm.status = 'accepted'
      AND a.profile_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION user_can_message(p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    NOT COALESCE((SELECT enabled FROM feature_flags WHERE key = 'messaging_premium_required'), false)
    OR COALESCE((SELECT is_premium FROM profiles WHERE id = p_user_id), false);
$$;

CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = p_conversation_id
      AND (
        (c.type = 'band'  AND is_band_conversation_member(c.context_id, p_user_id))
        OR (c.type = 'event' AND is_event_conversation_participant(c.context_id, p_user_id))
      )
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Drop before recreate so the script is re-runnable
DROP POLICY IF EXISTS "feature_flags_public_read" ON feature_flags;
DROP POLICY IF EXISTS "conversations_select"       ON conversations;
DROP POLICY IF EXISTS "conversations_insert"       ON conversations;
DROP POLICY IF EXISTS "messages_select"            ON messages;
DROP POLICY IF EXISTS "messages_insert"            ON messages;
DROP POLICY IF EXISTS "reads_select"               ON conversation_reads;
DROP POLICY IF EXISTS "reads_insert"               ON conversation_reads;
DROP POLICY IF EXISTS "reads_update"               ON conversation_reads;

-- feature_flags: public read, nobody writes (use service role)
CREATE POLICY "feature_flags_public_read" ON feature_flags FOR SELECT USING (true);

-- conversations: participant can see and create
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  is_conversation_participant(id, auth.uid())
);
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (
  user_can_message(auth.uid())
  AND (
    (type = 'band'  AND is_band_conversation_member(context_id, auth.uid()))
    OR (type = 'event' AND is_event_conversation_participant(context_id, auth.uid()))
  )
);

-- messages: participant can read; sender must be participant + can message
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  is_conversation_participant(conversation_id, auth.uid())
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND user_can_message(auth.uid())
  AND is_conversation_participant(conversation_id, auth.uid())
);

-- conversation_reads: own rows only
CREATE POLICY "reads_select" ON conversation_reads FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "reads_insert" ON conversation_reads FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "reads_update" ON conversation_reads FOR UPDATE USING (profile_id = auth.uid());

-- Realtime (idempotent wrapper)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;
