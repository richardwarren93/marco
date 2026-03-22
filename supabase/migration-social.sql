-- Marco Social Features Migration
-- Photo uploads, user profiles, follows, recipe sharing

-- ============================================
-- Storage Bucket for Recipe Photos
-- ============================================
-- NOTE: Run this in Supabase SQL Editor or create bucket via Dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-photos', 'recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access for recipe photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-photos');

CREATE POLICY "Users can upload own recipe photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own recipe photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- Recipe Photos Table
-- ============================================
CREATE TABLE recipe_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX recipe_photos_recipe_id ON recipe_photos(recipe_id);
CREATE INDEX recipe_photos_user_id ON recipe_photos(user_id);

ALTER TABLE recipe_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recipe photos"
  ON recipe_photos FOR SELECT USING (true);

CREATE POLICY "Users can insert own recipe photos"
  ON recipe_photos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipe photos"
  ON recipe_photos FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- User Profiles Table
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Follows Table
-- ============================================
CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX follows_follower_id ON follows(follower_id);
CREATE INDEX follows_following_id ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see follows"
  ON follows FOR SELECT USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE USING (auth.uid() = follower_id);

-- ============================================
-- Recipe Shares Table (explicit sharing)
-- ============================================
CREATE TABLE recipe_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

CREATE INDEX recipe_shares_user_id ON recipe_shares(user_id);
CREATE INDEX recipe_shares_recipe_id ON recipe_shares(recipe_id);

ALTER TABLE recipe_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shares"
  ON recipe_shares FOR SELECT USING (true);

CREATE POLICY "Users can share own recipes"
  ON recipe_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unshare own recipes"
  ON recipe_shares FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Update Recipes RLS for Social Visibility
-- ============================================
-- Drop the old catch-all policy
DROP POLICY IF EXISTS "Users can CRUD own recipes" ON recipes;

-- Owner can always see their own recipes, others can see shared ones
CREATE POLICY "Users can view own or shared recipes"
  ON recipes FOR SELECT USING (
    auth.uid() = user_id
    OR id IN (SELECT recipe_id FROM recipe_shares)
  );

CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Backfill profiles for existing users
-- ============================================
INSERT INTO profiles (id, display_name)
SELECT id, split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
