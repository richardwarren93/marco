-- Migration: Public community star-ratings (keyed by recipe_id)
--
-- NOTE: there is a SEPARATE, older `recipe_ratings` table (see
-- migration-collections-community.sql) that is keyed by `source_url` and is
-- still used by the community RatingStars component + /api/ratings. We do NOT
-- touch that feature's data — this new surface needs ratings tied to a specific
-- recipe_id (the representative recipe shown on Discover), so it gets its own
-- table: `recipe_star_ratings`.
--
-- Distinct from recipe_notes.personal_rating (which is PRIVATE per user). These
-- are aggregated + shown publicly on Discover + recipe detail. One rating per
-- user per recipe; aggregates are computed by the discover + rating API routes
-- via the service-role client. Safe to re-run.

CREATE TABLE IF NOT EXISTS recipe_star_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE recipe_star_ratings ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so this migration is safe to re-run.
DROP POLICY IF EXISTS "Star ratings readable by authenticated users" ON recipe_star_ratings;
CREATE POLICY "Star ratings readable by authenticated users"
  ON recipe_star_ratings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users manage own star ratings" ON recipe_star_ratings;
CREATE POLICY "Users manage own star ratings"
  ON recipe_star_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recipe_star_ratings_recipe ON recipe_star_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_star_ratings_user ON recipe_star_ratings(user_id);

-- ── Cleanup: undo edits an earlier version of this migration accidentally made
-- to the legacy `recipe_ratings` (source_url) table when it collided on name.
-- Remove the stray SELECT policy we added; the table's original
-- "Anyone can read ratings" + "Users manage own ratings" policies remain.
DROP POLICY IF EXISTS "Ratings are readable by all authenticated users" ON recipe_ratings;
