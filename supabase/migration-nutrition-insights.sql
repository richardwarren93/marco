-- Recipe Nutrition Estimates
-- Stores AI-estimated nutritional data per recipe per user
CREATE TABLE IF NOT EXISTS recipe_nutrition (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Per-serving values
  calories INTEGER,
  protein_g NUMERIC(6,1),
  carbs_g NUMERIC(6,1),
  fat_g NUMERIC(6,1),
  fiber_g NUMERIC(6,1),
  sugar_g NUMERIC(6,1),
  sodium_mg NUMERIC(7,1),
  -- Metadata
  confidence TEXT CHECK (confidence IN ('high','medium','low')),
  notes TEXT,
  estimated_at TIMESTAMPTZ DEFAULT now(),
  model_version TEXT,
  UNIQUE(recipe_id, user_id)
);

ALTER TABLE recipe_nutrition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own nutrition" ON recipe_nutrition
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nutrition" ON recipe_nutrition
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nutrition" ON recipe_nutrition
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nutrition" ON recipe_nutrition
  FOR DELETE USING (auth.uid() = user_id);

-- Meal Plan Insights Cache
-- Stores AI-generated weekly meal plan analysis
CREATE TABLE IF NOT EXISTS meal_plan_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  insights JSONB NOT NULL,
  meal_plan_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE meal_plan_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own insights" ON meal_plan_insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON meal_plan_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON meal_plan_insights
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own insights" ON meal_plan_insights
  FOR DELETE USING (auth.uid() = user_id);
