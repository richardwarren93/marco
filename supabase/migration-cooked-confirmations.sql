-- =============================================
-- Marco — Cooked Confirmations (earn-once-per-recipe-per-day)
-- Run after migration-tomato-earning.sql
--
-- A confirmation is the record that a user actually cooked a recipe on a given
-- UTC day. UNIQUE(user_id, recipe_id, cooked_date) makes "Cooked it" idempotent
-- per recipe per day, so the same recipe across multiple meal-plan slots can no
-- longer farm tomatoes. It also powers the weekly cooking recap.
-- =============================================

CREATE TABLE IF NOT EXISTS cooked_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  cooked_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id, cooked_date)
);

CREATE INDEX IF NOT EXISTS idx_cooked_confirmations_user_date
  ON cooked_confirmations(user_id, cooked_date);

ALTER TABLE cooked_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cooked confirmations"
  ON cooked_confirmations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Friends can view cooked confirmations"
  ON cooked_confirmations FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid() AND status = 'accepted'
    )
  );
