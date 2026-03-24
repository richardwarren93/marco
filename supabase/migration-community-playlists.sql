-- Migration: Community playlists
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS community_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  spotify_url text NOT NULL,
  description text,
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_playlist_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  playlist_id uuid REFERENCES community_playlists(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, playlist_id)
);

CREATE INDEX idx_community_playlists_upvotes ON community_playlists(upvotes DESC);
CREATE INDEX idx_community_playlist_votes_user ON community_playlist_votes(user_id);

ALTER TABLE community_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_playlist_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can read playlists
CREATE POLICY "Anyone can view playlists"
  ON community_playlists FOR SELECT
  USING (true);

-- Users can insert their own playlists
CREATE POLICY "Users can insert own playlists"
  ON community_playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own playlists
CREATE POLICY "Users can delete own playlists"
  ON community_playlists FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admin updates for vote count syncing
CREATE POLICY "Allow update for vote sync"
  ON community_playlists FOR UPDATE
  USING (true);

-- Everyone can read votes
CREATE POLICY "Anyone can view votes"
  ON community_playlist_votes FOR SELECT
  USING (true);

-- Users can manage their own votes
CREATE POLICY "Users can insert own votes"
  ON community_playlist_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON community_playlist_votes FOR DELETE
  USING (auth.uid() = user_id);
