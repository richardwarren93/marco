-- Migration: Add photo support to cooking_logs
-- Run this in Supabase Dashboard → SQL Editor

-- Add image and caption columns to cooking_logs
ALTER TABLE cooking_logs
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS caption text;

-- Allow friends to see each other's cooking logs (for cook photo gallery)
-- Drop old policy if it exists, then recreate
DROP POLICY IF EXISTS "Friends can view cooking logs" ON cooking_logs;
CREATE POLICY "Friends can view cooking logs"
  ON cooking_logs FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND (
          (user_id = auth.uid() AND friend_id = cooking_logs.user_id)
          OR (friend_id = auth.uid() AND user_id = cooking_logs.user_id)
        )
    )
  );
