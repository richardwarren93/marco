-- Migration: Public community star-ratings (keyed by recipe_id)
--
-- NOTE: there is a SEPARATE, older `recipe_ratings` table (see
-- migration-collections-community.sql) keyed by `source_url`. As of
-- 2026-11-22 nothing reads or writes it: its UI (RatingStars, inside
-- CommunitySection) was imported by the recipe detail page but never
-- rendered, and that component and /api/ratings have been deleted. The TABLE
-- is deliberately left in place — dropping it would destroy whatever ratings
-- users left before it went dark. See migration-recipe-ratings-legacy.sql for
-- the inspect-then-decide path on those rows; don't drop it before running
-- that file's step 1.
--
-- This surface needs ratings tied to a specific recipe_id (the representative
-- recipe shown on Discover), so it gets its own table.
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

-- Belt-and-braces: CREATE TABLE IF NOT EXISTS is a no-op if an EARLIER,
-- different version of this table already exists. If that version lacked a
-- unique index on exactly (user_id, recipe_id), the app's upsert
-- (onConflict: "user_id,recipe_id") fails with 42P10 — which the API does NOT
-- catch, so saving a rating 500s instead of degrading. Add the constraint when
-- no such index is present. (Checks indexes, not only constraints, because
-- ON CONFLICT infers from either. If this errors because duplicate
-- (user_id, recipe_id) rows exist, reconcile those by hand first.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = 'public.recipe_star_ratings'::regclass
      AND i.indisunique
      AND i.indpred IS NULL
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(i.indkey) AS k(attnum)
        JOIN pg_attribute a
          ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      ) = ARRAY['recipe_id', 'user_id']
  ) THEN
    ALTER TABLE recipe_star_ratings
      ADD CONSTRAINT recipe_star_ratings_user_id_recipe_id_key UNIQUE (user_id, recipe_id);
  END IF;
END $$;

ALTER TABLE recipe_star_ratings ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so this migration is safe to re-run.
-- Read: any signed-in user sees every rating (aggregates are public).
DROP POLICY IF EXISTS "Star ratings readable by authenticated users" ON recipe_star_ratings;
CREATE POLICY "Star ratings readable by authenticated users"
  ON recipe_star_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Write: a signed-in user may only insert/update/delete their OWN row.
-- (TO authenticated is explicit; anon has auth.uid() = NULL and so matches
-- nothing either way, but spelling it out keeps the intent readable.)
DROP POLICY IF EXISTS "Users manage own star ratings" ON recipe_star_ratings;
CREATE POLICY "Users manage own star ratings"
  ON recipe_star_ratings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recipe_star_ratings_recipe ON recipe_star_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_star_ratings_user ON recipe_star_ratings(user_id);

-- Keep updated_at honest for any write that doesn't set it explicitly. The API
-- route does set it on upsert, so this is only a safety net (and matches the
-- convention used by the other community tables).
-- Guarded on update_updated_at() existing (it's defined in schema.sql): a
-- missing function would abort the script and, in a single-transaction paste,
-- roll back the table above.
DROP TRIGGER IF EXISTS update_recipe_star_ratings_updated_at ON recipe_star_ratings;
DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at()') IS NOT NULL THEN
    CREATE TRIGGER update_recipe_star_ratings_updated_at
      BEFORE UPDATE ON recipe_star_ratings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  ELSE
    RAISE NOTICE 'update_updated_at() not found - skipping updated_at trigger. The API sets updated_at itself, so this is not fatal.';
  END IF;
END $$;

-- ── Cleanup: undo edits an earlier version of this migration accidentally made
-- to the legacy `recipe_ratings` (source_url) table when it collided on name.
-- Remove the stray SELECT policy we added; the table's original
-- "Anyone can read ratings" + "Users manage own ratings" policies remain.
--
-- Guarded: DROP POLICY IF EXISTS still errors (42P01) if the TABLE is absent —
-- the IF EXISTS covers the policy, not the relation. Unguarded, this last line
-- would abort the whole script, and because the Supabase SQL editor runs a
-- paste as one transaction that would roll back the table created above — the
-- migration would look like it failed for an unrelated reason and leave you
-- with nothing.
DO $$
BEGIN
  IF to_regclass('public.recipe_ratings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Ratings are readable by all authenticated users" ON recipe_ratings;
  END IF;
END $$;
