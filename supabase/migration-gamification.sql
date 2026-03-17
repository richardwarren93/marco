-- =============================================
-- Marco — Gamification & Social Feed
-- Run after migration-friends.sql
-- =============================================

-- =============================================
-- 1. Cooking Logs ("I Made This")
-- =============================================

CREATE TABLE cooking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  cooked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cooking_logs_user_id ON cooking_logs(user_id);
CREATE INDEX idx_cooking_logs_user_cooked_at ON cooking_logs(user_id, cooked_at);
CREATE INDEX idx_cooking_logs_recipe_id ON cooking_logs(recipe_id);

ALTER TABLE cooking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cooking logs"
  ON cooking_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Friends can view cooking logs"
  ON cooking_logs FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid() AND status = 'accepted'
    )
  );

-- =============================================
-- 2. Weekly Cooking Goals
-- =============================================

CREATE TABLE cooking_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weekly_target integer CHECK (weekly_target >= 1 AND weekly_target <= 7) NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cooking_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON cooking_goals FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- 3. Tomato Ledger
-- =============================================

CREATE TABLE tomato_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'cooked_recipe', 'community_note', 'weekly_goal_complete', 'feed_pet'
  )),
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tomato_transactions_user_id ON tomato_transactions(user_id);
CREATE INDEX idx_tomato_transactions_user_created ON tomato_transactions(user_id, created_at);

ALTER TABLE tomato_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON tomato_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON tomato_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cached balance on user_profiles for fast reads
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tomato_balance integer DEFAULT 0;

-- =============================================
-- 4. Virtual Pet
-- =============================================

CREATE TABLE user_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Marco Jr',
  hunger_level integer NOT NULL DEFAULT 4 CHECK (hunger_level >= 0 AND hunger_level <= 4),
  last_fed_at timestamptz DEFAULT now(),
  total_feedings integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pet"
  ON user_pets FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- 5. Activity Feed
-- =============================================

CREATE TABLE activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN (
    'cooked_recipe', 'saved_recipe', 'completed_goal'
  )),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_user_created ON activity_feed(user_id, created_at DESC);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and friend activity"
  ON activity_feed FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can insert own activity"
  ON activity_feed FOR INSERT WITH CHECK (auth.uid() = user_id);
