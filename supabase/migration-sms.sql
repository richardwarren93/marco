-- =============================================
-- Marco — SMS / Phone Integration
-- Run after migration-friends.sql (which creates user_profiles)
-- =============================================

-- Add phone fields to user_profiles. Phone is unique across verified users so
-- inbound SMS can resolve a single account. Unverified pending phones are not
-- unique-constrained so multiple users can attempt the same number until one
-- verifies it (the verifier wins; others must reclaim via re-verification).
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_phone_verified
  ON user_profiles(phone)
  WHERE phone_verified_at IS NOT NULL;

-- Pending verification codes. One row per (user_id, phone) — overwriting any
-- prior pending code if the user retries. Codes expire after 10 minutes.
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user
  ON phone_verifications(user_id);

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own verifications"
  ON phone_verifications FOR ALL USING (auth.uid() = user_id);

-- Optional log of inbound SMS for debugging / audit. Not required for the
-- feature to work; rate-limiting uses the existing ai_usage table.
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  direction text CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text NOT NULL,
  intent text,
  twilio_sid text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_user_created
  ON sms_messages(user_id, created_at DESC);
