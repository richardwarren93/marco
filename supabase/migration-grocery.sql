-- Migration: Grocery list tables
-- Smart grocery lists generated from weekly meal plans

CREATE TABLE grocery_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own grocery lists"
  ON grocery_lists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE grocery_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid REFERENCES grocery_lists(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount text,
  unit text,
  category text,
  recipe_sources text[] DEFAULT '{}',
  checked boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  in_pantry boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own grocery items"
  ON grocery_items FOR ALL
  USING (
    list_id IN (SELECT id FROM grocery_lists WHERE user_id = auth.uid())
  )
  WITH CHECK (
    list_id IN (SELECT id FROM grocery_lists WHERE user_id = auth.uid())
  );

CREATE INDEX idx_grocery_items_list ON grocery_items(list_id);
CREATE INDEX idx_grocery_lists_user_week ON grocery_lists(user_id, week_start);
