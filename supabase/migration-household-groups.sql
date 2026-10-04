-- Merge households with iMessage group chats.
--
-- A group chat (identified by its hashed id, group_hash) gets tied to a
-- household the moment a household member is present in it. After that, any
-- recipe saved in that group lands in the shared household kitchen — stored on
-- the household creator's account, which every member already sees via the
-- existing "same household → full recipe" sharing. So you + your partner + Marco
-- in one thread means every recipe either of you drops is in both your kitchens.
--
-- Additive + idempotent. Safe to run before or after the code deploy: the
-- iMessage route tolerates this table not existing yet (falls back to per-sender
-- saves). Writes happen via the service role (RLS bypassed); the SELECT policy
-- lets members read which groups their household is linked to.

CREATE TABLE IF NOT EXISTS household_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  group_hash text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE household_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members can view household groups" ON household_groups FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
