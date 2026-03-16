-- Migration: Add notes column, collections, and community features
-- Run this in the Supabase SQL Editor

-- Phase 1: Add notes to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS notes text;

-- Phase 3: Collections tables

CREATE TABLE IF NOT EXISTS collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  share_token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_recipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS collection_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text CHECK (permission IN ('read', 'collaborate')) DEFAULT 'read',
  created_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, shared_with_user_id)
);

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_collection_id ON collection_recipes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_recipe_id ON collection_recipes(recipe_id);

-- Collections RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_shares ENABLE ROW LEVEL SECURITY;

-- Collections: owner full access
CREATE POLICY "Users can manage own collections"
  ON collections FOR ALL USING (auth.uid() = user_id);

-- Collections: readable if shared or public
CREATE POLICY "Users can read shared collections"
  ON collections FOR SELECT
  USING (
    is_public = true
    OR id IN (SELECT collection_id FROM collection_shares WHERE shared_with_user_id = auth.uid())
  );

-- Collection recipes: manageable by collection owner
CREATE POLICY "Manage collection recipes for own collections"
  ON collection_recipes FOR ALL
  USING (collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid()));

-- Collection recipes: readable for shared/public collections
CREATE POLICY "Read collection recipes for shared collections"
  ON collection_recipes FOR SELECT
  USING (collection_id IN (
    SELECT id FROM collections WHERE is_public = true
    UNION
    SELECT collection_id FROM collection_shares WHERE shared_with_user_id = auth.uid()
  ));

-- Collection shares: owner manages, recipient reads
CREATE POLICY "Collection owner manages shares"
  ON collection_shares FOR ALL
  USING (collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid()));

CREATE POLICY "Users can see their own shares"
  ON collection_shares FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- Updated_at trigger for collections
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Phase 4: Community tables

CREATE TABLE IF NOT EXISTS recipe_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_url text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, source_url)
);

CREATE TABLE IF NOT EXISTS community_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_url text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community indexes
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_source_url ON recipe_ratings(source_url);
CREATE INDEX IF NOT EXISTS idx_community_notes_source_url ON community_notes(source_url);

-- Community RLS: users manage own, anyone can read
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ratings"
  ON recipe_ratings FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read ratings"
  ON recipe_ratings FOR SELECT USING (true);

CREATE POLICY "Users manage own community notes"
  ON community_notes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read community notes"
  ON community_notes FOR SELECT USING (true);

-- Updated_at triggers for community tables
CREATE TRIGGER update_recipe_ratings_updated_at
  BEFORE UPDATE ON recipe_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_community_notes_updated_at
  BEFORE UPDATE ON community_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
