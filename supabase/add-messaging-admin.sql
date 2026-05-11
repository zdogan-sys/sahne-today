-- Admin moderation fields on conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Blocked conversations: participants can still read but cannot send new messages
-- (sendMessage server action checks is_blocked; RLS only enforces SELECT/INSERT)
