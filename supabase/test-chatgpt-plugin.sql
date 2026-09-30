-- Run after the migration in the SAME transaction, then ROLLBACK.
-- Synthetic client only; no customer records are read or changed.
INSERT INTO public.marco_plugin_clients(client_id,resource)
VALUES ('11111111-1111-4111-8111-111111111111','https://marco.example.test/api/mcp');

DO $$
DECLARE original jsonb; result jsonb;
BEGIN
  IF NOT has_function_privilege('supabase_auth_admin','public.marco_plugin_access_token_hook(jsonb)','EXECUTE')
    OR NOT has_table_privilege('supabase_auth_admin','public.marco_plugin_clients','SELECT') THEN
    RAISE EXCEPTION 'Auth service is missing hook permissions';
  END IF;
  original := '{"client_id":"11111111-1111-4111-8111-111111111111","claims":{"sub":"22222222-2222-4222-8222-222222222222","aud":"authenticated","role":"authenticated"}}';
  result := public.marco_plugin_access_token_hook(original);
  IF result->'claims'->>'aud' <> 'https://marco.example.test/api/mcp'
    OR result->'claims'->>'marco_access' <> 'read' THEN
    RAISE EXCEPTION 'Plugin token hook did not bind the audience and access claim';
  END IF;
  original := '{"claims":{"sub":"22222222-2222-4222-8222-222222222222","aud":"authenticated","role":"authenticated"}}';
  IF public.marco_plugin_access_token_hook(original) <> original THEN
    RAISE EXCEPTION 'First-party session claims were changed';
  END IF;
END;
$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","marco_access":"read"}',true);
DO $$
BEGIN
  BEGIN
    PERFORM public.marco_require_first_party_data_api();
    RAISE EXCEPTION 'Plugin token was allowed through Data API guard';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
SELECT public.marco_require_first_party_data_api();
RESET ROLE;
