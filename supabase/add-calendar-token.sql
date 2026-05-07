-- Persistent calendar subscription token per user
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS calendar_token uuid DEFAULT uuid_generate_v4() UNIQUE;

-- Fill token for existing profiles that don't have one yet
UPDATE profiles SET calendar_token = uuid_generate_v4() WHERE calendar_token IS NULL;
