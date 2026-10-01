BEGIN;
-- Existing OAuth grants do not acquire write permission automatically.
CREATE TABLE IF NOT EXISTS public.marco_plugin_permissions (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.marco_plugin_clients(client_id) ON DELETE CASCADE NOT NULL,
  recipe_save_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);
ALTER TABLE public.marco_plugin_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marco_plugin_permissions FROM anon, authenticated;
GRANT ALL ON public.marco_plugin_permissions TO service_role;
-- A deterministic content key makes retries/concurrent button clicks safe.
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS plugin_save_key text;
CREATE UNIQUE INDEX IF NOT EXISTS recipes_plugin_save_key ON public.recipes(user_id, plugin_save_key) WHERE plugin_save_key IS NOT NULL;
COMMIT;
