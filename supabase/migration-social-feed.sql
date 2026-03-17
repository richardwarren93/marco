-- Marco: Social Feed Enhancement — Images, Captions & Votes
-- Run this in Supabase SQL Editor

-- =============================================
-- 1. Add image and caption to activity_feed
-- =============================================

ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS caption text;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS upvotes integer DEFAULT 0;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS downvotes integer DEFAULT 0;

-- =============================================
-- 2. Feed Votes table
-- =============================================

CREATE TABLE IF NOT EXISTS feed_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_votes_activity ON feed_votes(activity_id);
CREATE INDEX IF NOT EXISTS idx_feed_votes_user ON feed_votes(user_id);

ALTER TABLE feed_votes ENABLE ROW LEVEL SECURITY;

-- Users can view votes on posts they can see (own + friends)
CREATE POLICY "Users can view votes on visible posts"
  ON feed_votes FOR SELECT
  USING (
    activity_id IN (
      SELECT id FROM activity_feed WHERE
        user_id = auth.uid()
        OR user_id IN (
          SELECT friend_id FROM friendships WHERE user_id = auth.uid() AND status = 'accepted'
          UNION
          SELECT user_id FROM friendships WHERE friend_id = auth.uid() AND status = 'accepted'
        )
    )
  );

CREATE POLICY "Users can manage own votes"
  ON feed_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON feed_votes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON feed_votes FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 3. Update policy for activity_feed to allow updating own posts
-- =============================================

CREATE POLICY "Users can update own activity"
  ON activity_feed FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 4. Storage bucket for feed images
-- =============================================
-- NOTE: Create the 'feed-images' bucket in Supabase Dashboard > Storage
-- Set it as PUBLIC bucket
-- Add policy: authenticated users can upload to their own folder
-- Path pattern: {user_id}/{filename}
