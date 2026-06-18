-- =============================================
-- Marco — Tomato Earning Expansion
-- Run after migration-gamification.sql
--
-- Adds new earning reasons, the (previously missing) atomic balance RPC, and a
-- meal_plan_id link on cooking_logs so a cook can be tied to a planned slot.
-- =============================================

-- ---------------------------------------------
-- 1. Extend the tomato_transactions reason CHECK
-- ---------------------------------------------
-- The original constraint is inline + unnamed, so Postgres auto-named it
-- tomato_transactions_reason_check. If your DB named it differently, adjust the
-- DROP below (check with \d tomato_transactions).
ALTER TABLE tomato_transactions
  DROP CONSTRAINT IF EXISTS tomato_transactions_reason_check;

ALTER TABLE tomato_transactions
  ADD CONSTRAINT tomato_transactions_reason_check CHECK (reason IN (
    -- existing
    'cooked_recipe', 'community_note', 'weekly_goal_complete', 'feed_pet',
    -- new earning actions
    'added_to_meal_plan', 'friend_invite_accepted', 'recipe_rating', 'recipe_photo'
  ));

-- ---------------------------------------------
-- 2. Atomic balance increment (the path all award sites assumed existed)
-- ---------------------------------------------
-- A single UPDATE ... RETURNING avoids the read-modify-write race the old
-- hand-rolled award code suffered from. Returns the NEW balance.
CREATE OR REPLACE FUNCTION increment_tomato_balance(
  p_user_id UUID,
  p_amount  INTEGER
) RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE user_profiles
     SET tomato_balance = COALESCE(tomato_balance, 0) + p_amount
   WHERE user_id = p_user_id
   RETURNING tomato_balance INTO new_balance;
  RETURN new_balance; -- NULL if no profile row exists (caller handles defensively)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------
-- 3. Link a cook to a planned meal slot
-- ---------------------------------------------
-- Nullable + additive: existing /api/cooking-log inserts keep working. ON DELETE
-- SET NULL so removing a meal-plan slot never deletes cooking history.
ALTER TABLE cooking_logs
  ADD COLUMN IF NOT EXISTS meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cooking_logs_meal_plan_id ON cooking_logs(meal_plan_id);
