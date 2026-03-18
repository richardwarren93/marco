-- ============================================
-- Marco — Restaurant Tracker ("Eats") Tables
-- ============================================

-- Core restaurant entity
CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  cuisine text,
  neighborhood text,
  address text,
  city text,
  google_maps_url text,
  website_url text,
  phone text,
  price_range integer CHECK (price_range >= 1 AND price_range <= 4),
  status text CHECK (status IN ('wishlist', 'visited', 'favorite', 'avoid')) DEFAULT 'wishlist',
  tags text[] DEFAULT '{}',
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  would_go_back boolean,
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Per-visit log
CREATE TABLE restaurant_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  visited_at date NOT NULL DEFAULT CURRENT_DATE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  dishes_ordered text[] DEFAULT '{}',
  notes text,
  companions text,
  occasion text,
  spent_approx decimal,
  created_at timestamptz DEFAULT now()
);

-- Curated shareable lists
CREATE TABLE restaurant_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  share_token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Join table for lists
CREATE TABLE restaurant_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES restaurant_lists(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  position integer DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(list_id, restaurant_id)
);

-- Indexes
CREATE INDEX idx_restaurants_user ON restaurants(user_id);
CREATE INDEX idx_restaurants_user_status ON restaurants(user_id, status);
CREATE INDEX idx_restaurants_tags ON restaurants USING gin(tags);
CREATE INDEX idx_restaurant_visits_restaurant ON restaurant_visits(restaurant_id);
CREATE INDEX idx_restaurant_visits_user_date ON restaurant_visits(user_id, visited_at);
CREATE INDEX idx_restaurant_lists_user ON restaurant_lists(user_id);
CREATE INDEX idx_restaurant_list_items_list ON restaurant_list_items(list_id);

-- RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_list_items ENABLE ROW LEVEL SECURITY;

-- Restaurants: owner only
CREATE POLICY "Users can manage own restaurants"
  ON restaurants FOR ALL USING (auth.uid() = user_id);

-- Visits: owner only
CREATE POLICY "Users can manage own visits"
  ON restaurant_visits FOR ALL USING (auth.uid() = user_id);

-- Lists: owner can do everything
CREATE POLICY "Users can manage own lists"
  ON restaurant_lists FOR ALL USING (auth.uid() = user_id);

-- Lists: public read
CREATE POLICY "Public lists are viewable"
  ON restaurant_lists FOR SELECT USING (is_public = true);

-- List items: owner can manage
CREATE POLICY "Users can manage own list items"
  ON restaurant_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM restaurant_lists
      WHERE restaurant_lists.id = restaurant_list_items.list_id
      AND restaurant_lists.user_id = auth.uid()
    )
  );

-- List items: viewable for public lists
CREATE POLICY "Public list items are viewable"
  ON restaurant_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurant_lists
      WHERE restaurant_lists.id = restaurant_list_items.list_id
      AND restaurant_lists.is_public = true
    )
  );

-- Updated_at triggers (reuse existing function if available, or create)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END
$$;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER restaurant_lists_updated_at
  BEFORE UPDATE ON restaurant_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
