-- Beli-style cook ratings: a personal RANKED taste list built by head-to-head
-- comparisons, not stars. Each cook you rate gets a sentiment bucket
-- (loved / fine / nope) and a score in that bucket's range, found by comparing
-- it against dishes you've already ranked. Feeds recommendations + taste.
--
-- Score ranges:  nope [0, 3.33)  ·  fine [3.33, 6.67)  ·  loved [6.67, 10]
--
-- Additive + idempotent.

CREATE TABLE IF NOT EXISTS cook_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  sentiment text CHECK (sentiment IN ('loved', 'fine', 'nope')) NOT NULL,
  score real NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE cook_ratings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own cook ratings" ON cook_ratings FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_cook_ratings_user_score ON cook_ratings(user_id, sentiment, score);
