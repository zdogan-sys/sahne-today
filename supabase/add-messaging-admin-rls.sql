-- Site adminine conversations ve messages tablosunda tam SELECT yetkisi ver
-- Böylece admin Realtime subscription'da tüm mesajları alabilir

CREATE OR REPLACE FUNCTION is_site_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'z_dogan@hotmail.com'
  );
$$;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  is_site_admin()
  OR is_conversation_participant(id, auth.uid())
);

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  is_site_admin()
  OR is_conversation_participant(conversation_id, auth.uid())
);
