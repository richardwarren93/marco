-- Household feature: shared grocery lists between housemates
-- Run this migration after deploying the code changes.

CREATE TABLE households (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text DEFAULT 'My Household',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE household_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(household_id, user_id)
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Household: members can see their own household
CREATE POLICY "Members can view own household" ON households FOR SELECT
  USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Household: creator can manage (update/delete)
CREATE POLICY "Creator can manage household" ON households FOR ALL
  USING (created_by = auth.uid());

-- Members: users can see members of their household
CREATE POLICY "Members can view household members" ON household_members FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Members: users can manage own membership (join/leave)
CREATE POLICY "Users can manage own membership" ON household_members FOR ALL
  USING (user_id = auth.uid());

-- Allow inserting households (for creation)
CREATE POLICY "Authenticated users can create households" ON households FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Allow inserting memberships (for joining)
CREATE POLICY "Authenticated users can join households" ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
