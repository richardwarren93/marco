-- Ingredient price cache: stores estimated prices per ingredient name
-- Used to instantly calculate grocery list costs without LLM calls

CREATE TABLE IF NOT EXISTS ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL, -- lowercase, trimmed for matching
  unit TEXT, -- per what unit (lb, oz, each, etc.)
  price_low NUMERIC(8,2) NOT NULL, -- budget/sale price in USD
  price_high NUMERIC(8,2) NOT NULL, -- typical retail price in USD
  category TEXT, -- produce, protein, dairy, pantry, etc.
  source TEXT DEFAULT 'claude', -- 'claude', 'manual', 'usda'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name_normalized, unit)
);

-- Index for fast lookups by normalized name
CREATE INDEX IF NOT EXISTS idx_ingredient_prices_name ON ingredient_prices(name_normalized);

-- RLS: readable by all authenticated users (prices are not user-specific)
ALTER TABLE ingredient_prices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ingredient_prices' AND policyname = 'Authenticated users can read prices'
  ) THEN
    CREATE POLICY "Authenticated users can read prices"
      ON ingredient_prices FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Service role can insert/update (for batch seeding and cache updates)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ingredient_prices' AND policyname = 'Service role can manage prices'
  ) THEN
    CREATE POLICY "Service role can manage prices"
      ON ingredient_prices FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
