-- Marco decision engine — foundational schema (the redesign).
--
-- Three new objects:
--   1. catalog_recipes  — a SHARED, STRUCTURED seed catalog (the candidate pool
--      the engine scores). Unlike `recipes` (user-owned, unstructured), every
--      catalog row carries the fields the scorer needs directly, so
--      recommendation is a cheap local ranking, not runtime keyword inference.
--   2. cook_events      — append-only flywheel log: every check-in / suggestion
--      / cook / skip+reason / rating, with a context snapshot. Fuels online
--      learning now and a trained recommender later.
--   3. cook_profiles    — the LEARNED behavioral layer, seeded from the existing
--      user_preferences.taste_profile and updated from cook_events. The flavor
--      vector still originates from taste_profile.cached_profile.all — we don't
--      duplicate taste computation, we extend it with behavioral signal.

-- ── 1. Shared seed catalog ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog_recipes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  -- Normalized title, auto-computed + UNIQUE → "count only once" across every
  -- source (existing recipes, Spoonacular, AI). All importers ON CONFLICT DO NOTHING.
  title_key          TEXT GENERATED ALWAYS AS (lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))) STORED,
  description        TEXT,
  ingredients        JSONB NOT NULL DEFAULT '[]',   -- [{name, amount, unit}]
  steps              JSONB NOT NULL DEFAULT '[]',   -- ["step 1", ...]
  servings           INTEGER,
  prep_time_minutes  INTEGER,
  cook_time_minutes  INTEGER,
  total_time_minutes INTEGER,                        -- denormalized for effort scoring
  meal_type          TEXT NOT NULL DEFAULT 'dinner'
                       CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),

  -- Structured signals the engine scores on (no runtime keyword inference):
  cuisine            TEXT,                           -- italian | asian | mediterranean | latin | american | indian | french | ...
  difficulty         SMALLINT CHECK (difficulty BETWEEN 1 AND 5),  -- effort, 1=trivial 5=project
  flavor             JSONB NOT NULL DEFAULT '{}',    -- {sweet,savory,richness,tangy,spicy} 0-100
  dietary_flags      TEXT[] NOT NULL DEFAULT '{}',   -- vegetarian | vegan | gluten_free | dairy_free | low_carb | ...
  primary_protein    TEXT,                           -- chicken | beef | pork | seafood | tofu | beans | egg | none
  key_ingredients    TEXT[] NOT NULL DEFAULT '{}',   -- normalized mains, for pantry / spoilage matching
  tags               TEXT[] NOT NULL DEFAULT '{}',
  image_url          TEXT,

  -- Provenance + lifecycle:
  source             TEXT NOT NULL DEFAULT 'ai_generated', -- 'spoonacular' | 'ai_generated' | ...
  external_id        TEXT,                                 -- e.g. 'spoonacular:715538' (dedup)
  source_url         TEXT,                                 -- attribution link (required by licensed sources)
  model_version      TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,

  -- Flywheel-derived quality (updated from real cook_events; lets good recipes
  -- rise and duds sink without manual curation):
  cook_count         INTEGER NOT NULL DEFAULT 0,
  avg_rating         NUMERIC,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_title_key ON catalog_recipes (title_key);
CREATE INDEX IF NOT EXISTS idx_catalog_active_meal ON catalog_recipes (meal_type) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_catalog_cuisine     ON catalog_recipes (cuisine)   WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_catalog_time        ON catalog_recipes (total_time_minutes) WHERE is_active;

-- Shared read-only catalog: any authenticated user can read; only the service
-- role (catalog generator, flywheel updater) writes.
ALTER TABLE catalog_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "catalog readable by authenticated" ON catalog_recipes;
CREATE POLICY "catalog readable by authenticated" ON catalog_recipes
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 2. Flywheel event log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  action        TEXT NOT NULL
                  CHECK (action IN ('checkin','suggested','viewed','assigned','cooked','skipped','swapped','rated')),
  recipe_id     UUID,                                 -- catalog_recipes.id or recipes.id
  recipe_source TEXT CHECK (recipe_source IN ('catalog','user')),
  context       JSONB NOT NULL DEFAULT '{}',          -- {time_budget, energy, ingredient_mode, day_of_week, meal_type}
  reason        TEXT,                                 -- skip/swap reason (no_time | low_energy | missing_ingredients | not_feeling_it | ...)
  outcome       JSONB NOT NULL DEFAULT '{}',          -- {rating, difficulty: too_easy|just_right|too_hard}
  meta          JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_cook_events_user_time ON cook_events (user_id, created_at DESC);

ALTER TABLE cook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own cook_events" ON cook_events;
CREATE POLICY "own cook_events" ON cook_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3. Learned behavioral profile ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cook_profiles (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cuisine_affinity  JSONB NOT NULL DEFAULT '{}',      -- {italian: 0.7, asian: 0.9, ...}  -1..1
  ingredient_scores JSONB NOT NULL DEFAULT '{}',      -- {chicken: 0.8, fish: -0.4, ...}  -1..1
  flavor            JSONB NOT NULL DEFAULT '{}',      -- seeded from taste_profile.cached_profile.all
  effort_tolerance  JSONB NOT NULL DEFAULT '{}',      -- {weeknight_minutes: 25, weekend_minutes: 60}
  day_patterns      JSONB NOT NULL DEFAULT '{}',      -- {wed: {time:'low', energy:'low'}, ...}
  novelty_pref      NUMERIC NOT NULL DEFAULT 0.5,     -- 0 = repeat favorites .. 1 = crave variety
  adventurousness   NUMERIC NOT NULL DEFAULT 0.5,     -- willingness to try new cuisines/techniques
  cadence_per_week  NUMERIC,                          -- learned cooking nights/week
  skill_level       SMALLINT NOT NULL DEFAULT 2 CHECK (skill_level BETWEEN 1 AND 5),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cook_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own cook_profile" ON cook_profiles;
CREATE POLICY "own cook_profile" ON cook_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
