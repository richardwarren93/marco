-- Migration: ingredient_categories cache
-- Backs the AI 3rd-pass fallback in src/lib/ingredientCategorizer.ts.
-- When the static aliasMap and keyword regex both miss, we ask Claude Haiku
-- to categorize the ingredient and persist the answer here so we never pay
-- the API cost twice for the same name.

CREATE TABLE IF NOT EXISTS ingredient_categories (
  name       text PRIMARY KEY,
  category   text NOT NULL,
  source     text NOT NULL DEFAULT 'ai',  -- 'ai' | 'manual'
  created_at timestamptz DEFAULT now()
);

-- Read-anywhere, write-only-via-service-role (the route handler uses admin).
-- No user-scoped RLS needed; the cache is global by design.
ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ingredient categories"
  ON ingredient_categories FOR SELECT
  USING (true);
