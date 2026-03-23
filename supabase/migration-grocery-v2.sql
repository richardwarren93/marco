-- Grocery v2 migration
-- Adds: soft delete, item overrides, date range support, generation tracking

-- grocery_items: soft delete + per-field user overrides
ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS soft_deleted    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS name_override   text,
  ADD COLUMN IF NOT EXISTS amount_override text,
  ADD COLUMN IF NOT EXISTS unit_override   text,
  ADD COLUMN IF NOT EXISTS category_override text;

-- grocery_lists: flexible date range + generation metadata
ALTER TABLE grocery_lists
  ADD COLUMN IF NOT EXISTS date_end      date,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS meal_count   integer DEFAULT 0;

-- Backfill date_end for existing lists (week_start + 6 days)
UPDATE grocery_lists
SET date_end = (week_start::date + interval '6 days')::date
WHERE date_end IS NULL;
