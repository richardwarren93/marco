-- Track daily AI usage per user per endpoint
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id  UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT    NOT NULL,
  date     DATE    NOT NULL DEFAULT CURRENT_DATE,
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, endpoint, date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai_usage"
  ON ai_usage FOR SELECT USING (auth.uid() = user_id);

-- Atomic increment — returns the NEW count after incrementing
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id  UUID,
  p_endpoint TEXT,
  p_date     DATE
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO ai_usage (user_id, endpoint, date, count)
  VALUES (p_user_id, p_endpoint, p_date, 1)
  ON CONFLICT (user_id, endpoint, date)
  DO UPDATE SET count = ai_usage.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
