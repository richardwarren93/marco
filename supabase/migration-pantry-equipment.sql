-- Marco: Pantry Enhancement — Kitchen Equipment Table
-- Run this in Supabase SQL Editor

-- Kitchen equipment table
CREATE TABLE IF NOT EXISTS user_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, equipment_name)
);

CREATE INDEX user_equipment_user_id ON user_equipment(user_id);

ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own equipment"
  ON user_equipment FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
