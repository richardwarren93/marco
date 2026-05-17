-- Push notification device tokens.
--
-- One row per (user, device) pair. When a user signs in on a new device,
-- a new row is inserted. When iOS or Android rotates a token, the new
-- token is inserted and old ones eventually go cold (we GC unused tokens
-- when APNs/FCM rejects them on send).
--
-- This unlocks two things:
--   1. iOS Apple guideline 4.2 — push capability is genuinely wired, not
--      just declared in entitlements.
--   2. Future server-side notification sending ("Sarah saved a recipe"
--      household pings, weekly digest, etc.) once we add a worker that
--      calls APNs / FCM with these tokens.

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see / write their own tokens. Server-side jobs that
-- read tokens to send notifications use the service-role key, which
-- bypasses RLS.
CREATE POLICY "push_tokens_select_own" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);
