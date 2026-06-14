-- Marco Plus — subscription / entitlement columns.
--
-- Phase 1 of monetization. A user is "plus" when subscription_tier = 'plus'
-- AND plus_expires_at is null (lifetime/active) or in the future. These columns
-- are written by the RevenueCat webhook in Phase 2 — never by the client.
--
-- SECURITY NOTE (Phase 2): ensure the user_profiles UPDATE policy does NOT let
-- a user set these columns themselves (otherwise anyone could self-upgrade).
-- Either scope the update policy to non-subscription columns, or move these to
-- a service-role-only table. Until enforcement is on (see ENFORCE_ENTITLEMENTS
-- in src/lib/entitlements.ts) this is inert.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  -- null = no expiry tracked yet; a past timestamp = lapsed back to free.
  ADD COLUMN IF NOT EXISTS plus_expires_at TIMESTAMPTZ,
  -- The store product the entitlement came from (e.g. marco_plus_annual).
  ADD COLUMN IF NOT EXISTS plus_product_id TEXT,
  -- Whether the subscription is set to auto-renew (from the store).
  ADD COLUMN IF NOT EXISTS plus_will_renew BOOLEAN NOT NULL DEFAULT FALSE,
  -- Last time the entitlement was synced from the store / webhook.
  ADD COLUMN IF NOT EXISTS plus_updated_at TIMESTAMPTZ;

-- Constrain to known tiers.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_subscription_tier_check'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_subscription_tier_check
      CHECK (subscription_tier IN ('free', 'plus'));
  END IF;
END $$;

-- Fast lookups of active subscribers (for ops / churn queries).
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier
  ON user_profiles (subscription_tier)
  WHERE subscription_tier = 'plus';

-- ── Protect subscription columns from client writes ──────────────────────────
-- The existing "Users can manage own profile" policy is FOR ALL, so without
-- this a signed-in user could PATCH their own row and set subscription_tier =
-- 'plus'. RLS can't restrict individual columns, so a BEFORE UPDATE trigger
-- reverts any change to the subscription columns unless the caller is the
-- service role (the RevenueCat webhook, which uses the service key). Migrations
-- run as the table owner and are likewise allowed.
CREATE OR REPLACE FUNCTION protect_subscription_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.plus_expires_at   := OLD.plus_expires_at;
    NEW.plus_product_id   := OLD.plus_product_id;
    NEW.plus_will_renew   := OLD.plus_will_renew;
    NEW.plus_updated_at   := OLD.plus_updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_subscription_columns ON user_profiles;
CREATE TRIGGER trg_protect_subscription_columns
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION protect_subscription_columns();
