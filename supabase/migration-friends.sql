-- =============================================
-- Marco — Friends & Sharing
-- Run this migration after migration-restaurants.sql
-- =============================================

-- =============================================
-- Phase 1: User Profiles
-- =============================================

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  friend_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_friend_code ON user_profiles(friend_code);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON user_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read profiles"
  ON user_profiles FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Phase 2: Friendships
-- =============================================

CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Phase 3: Recipe Shares
-- =============================================

CREATE TABLE recipe_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  shared_by_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text,
  seen boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(recipe_id, shared_by_user_id, shared_with_user_id)
);

CREATE INDEX idx_recipe_shares_shared_with ON recipe_shares(shared_with_user_id);
CREATE INDEX idx_recipe_shares_recipe ON recipe_shares(recipe_id);

ALTER TABLE recipe_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipe shares"
  ON recipe_shares FOR SELECT
  USING (auth.uid() = shared_by_user_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Users can create recipe shares"
  ON recipe_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Recipients can update recipe shares"
  ON recipe_shares FOR UPDATE
  USING (auth.uid() = shared_with_user_id);
