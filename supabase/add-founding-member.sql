-- Founding member status on profiles
-- Kurucu üyeler otomatik olarak premium olur (trigger ile garanti altına alınır)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founding_member boolean DEFAULT false NOT NULL;

-- Trigger: kurucu üye yapılınca otomatik premium ver, kurucu üyelik kaldırılsa da premium kalır
CREATE OR REPLACE FUNCTION sync_founding_member_premium()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_founding_member = true THEN
    NEW.is_premium := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_founding_member_premium ON profiles;
CREATE TRIGGER trg_founding_member_premium
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_founding_member_premium();
