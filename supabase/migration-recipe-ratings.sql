-- Migration: Public community recipe ratings
-- Distinct from recipe_notes.personal_rating (which is PRIVATE per user).
-- These ratings are aggregated and shown publicly on Discover + recipe detail.
-- One rating per user per recipe; aggregate average/count is computed by the
-- discover + rating API routes via the service-role client.

CREATE TABLE IF NOT EXISTS recipe_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so this migration is safe to re-run (CREATE POLICY is not
-- idempotent and errors if the policy already exists).

-- Anyone signed in can read ratings (needed to show community averages).
DROP POLICY IF EXISTS "Ratings are readable by all authenticated users" ON recipe_ratings;
CREATE POLICY "Ratings are readable by all authenticated users"
  ON recipe_ratings FOR SELECT
  TO authenticated
  USING (true);

-- A user may only create / update / delete their own rating rows.
DROP POLICY IF EXISTS "Users manage own ratings" ON recipe_ratings;
CREATE POLICY "Users manage own ratings"
  ON recipe_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe ON recipe_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_user ON recipe_ratings(user_id);
