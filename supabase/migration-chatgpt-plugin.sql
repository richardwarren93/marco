-- Prepare only; apply after reviewing the production schema and existing Auth
-- hooks. Configure an OAuth client row and enable this custom access-token hook
-- in Supabase before setting MARCO_MCP_CLIENT_IDS on the app.
-- This file does not enable OAuth or replace any existing hook automatically.
BEGIN;

CREATE TABLE IF NOT EXISTS public.marco_plugin_clients (
  client_id uuid PRIMARY KEY,
  resource text NOT NULL CHECK (resource LIKE 'https://%/api/mcp'),
  enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE public.marco_plugin_clients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marco_plugin_clients FROM anon, authenticated;
GRANT SELECT ON public.marco_plugin_clients TO supabase_auth_admin;
DROP POLICY IF EXISTS "Auth hook reads plugin configuration" ON public.marco_plugin_clients;
CREATE POLICY "Auth hook reads plugin configuration"
  ON public.marco_plugin_clients FOR SELECT TO supabase_auth_admin USING (true);

CREATE OR REPLACE FUNCTION public.marco_plugin_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  claims jsonb := event->'claims';
  client text := coalesce(event->>'client_id', event->'claims'->>'client_id');
  resource_url text;
BEGIN
  SELECT resource INTO resource_url FROM public.marco_plugin_clients
    WHERE client_id::text = client AND enabled;
  IF resource_url IS NOT NULL THEN
    claims := jsonb_set(claims, '{aud}', to_jsonb(resource_url));
    claims := jsonb_set(claims, '{marco_access}', '"read"'::jsonb);
    event := jsonb_set(event, '{claims}', claims);
  END IF;
  RETURN event;
END;
$$;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.marco_plugin_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.marco_plugin_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;

-- Plugin tokens must not bypass the tool surface and inherit normal CRUD RLS.
-- Restrictive policies combine with (not replace) existing permissive policies.
-- Server-only tools use the service role with explicit subject/membership checks.
-- Apply the same restriction to any subsequently added exposed RLS tables.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT schemaname, tablename FROM pg_tables
    WHERE (schemaname = 'public' OR (schemaname = 'storage' AND tablename IN ('objects', 'buckets'))) AND rowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS marco_plugin_requires_tools ON %I.%I', t.schemaname, t.tablename);
    EXECUTE format('CREATE POLICY marco_plugin_requires_tools ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((auth.jwt() ->> ''marco_access'') IS NULL) WITH CHECK ((auth.jwt() ->> ''marco_access'') IS NULL)', t.schemaname, t.tablename);
  END LOOP;
END;
$$;

-- RLS alone does not constrain SECURITY DEFINER RPCs. Reject plugin-marked
-- tokens before PostgREST dispatches either table requests or RPC calls.
CREATE OR REPLACE FUNCTION public.marco_require_first_party_data_api()
RETURNS void LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF auth.jwt() ->> 'marco_access' IS NOT NULL THEN
    RAISE insufficient_privilege USING MESSAGE = 'Use the Marco MCP endpoint for plugin requests';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.marco_require_first_party_data_api() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marco_require_first_party_data_api() TO anon, authenticated, service_role;

-- Do not silently replace an existing pre-request hook.
DO $$
DECLARE existing text;
BEGIN
  SELECT setting INTO existing FROM pg_db_role_setting s
    JOIN pg_roles r ON r.oid=s.setrole, unnest(s.setconfig) setting
    WHERE r.rolname='authenticator' AND setting LIKE 'pgrst.db_pre_request=%'
    AND setting NOT IN ('pgrst.db_pre_request=', 'pgrst.db_pre_request=public.marco_require_first_party_data_api') LIMIT 1;
  IF existing IS NOT NULL THEN
    RAISE EXCEPTION 'An existing PostgREST pre-request hook must be composed manually';
  END IF;
END;
$$;
ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.marco_require_first_party_data_api';
NOTIFY pgrst, 'reload config';

COMMIT;
