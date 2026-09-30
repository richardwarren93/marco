# Marco in the public ChatGPT plugin directory

Status: implementation deployed in commit `93ae434` and connected in ChatGPT;
not packaged for submission, submitted, or published. Publisher requested: **ACGC**. This release
is **free**, with no Marco Plus entitlement check. User selected all supported countries and questions@windwalk.com for support.

Verified on September 30, 2026: all six automated plugin tests passed; targeted
ESLint and project TypeScript passed; the full Next.js production build passed
after rerunning outside the Windows filesystem sandbox. The build still warns
about multiple workspace lockfiles. The SQL migration and synthetic SQL checks
passed on the live project. Live OAuth connection and one read-only recipe
search passed in ChatGPT. The full public-review cases have not been run.

OAuth setup progress (September 30, 2026): inspected the live Marco Supabase
project `jwioqapvtejfjckrjwcv`. Its current signing key is ECC P-256 and there
were no configured Auth hooks. Applied `migration-chatgpt-plugin.sql` after a
rollback-only dry run and synthetic tests of token claims and the Data API
guard. Verified the client table, token-hook function, pre-request RPC guard,
and 58 restrictive policies. With the user's approval, enabled OAuth Server and
the `public.marco_plugin_access_token_hook` Auth hook. Dynamic registration is
disabled. Registered the public PKCE client `0268bcfc-f47e-452c-8d3c-2f1a666b900f`
as "Marco for ChatGPT", using the exact callback shown by ChatGPT:
`https://chatgpt.com/connector/oauth/-v-FYZP7l0s1`. Added it to the database
allowlist and production `MARCO_MCP_CLIENT_IDS`.

The old Supabase Site URL `https://marco-windwalk.vercel.app/` led to a Vercel
sign-in wall. Changed it to `https://marco-eta-lyart.vercel.app`, which is public,
and Vercel confirms it is the production domain. Set production
`NEXT_PUBLIC_APP_URL=https://marco-eta-lyart.vercel.app`. Vercel deployment
`HD26LroUBpDvC7B2d4XGbm8xn9wj` reached Ready, and the public `/connect/marco`
page was verified in the browser. The saved OAuth consent URL is
`https://marco-eta-lyart.vercel.app/connect/marco`. OAuth metadata is live and
advertises PKCE S256, public clients, and refresh tokens.
Production redeployment `5XuwbkGiiUQ6NcKzDezEbazd1zew` reached Ready. Verified
the MCP's unauthenticated 401 challenge and protected-resource metadata.
ChatGPT successfully discovered the endpoints and began authorization with the
registered client; it redirected to the live Marco sign-in/consent page. The
user completed authorization, and ChatGPT shows Marco as connected. A live
read-only saved-recipe search with limit 1 succeeded, verifying the connection
through an authenticated tool call. Refresh, denial, and revocation remain
untested. The ChatGPT connection is personal development setup, not a
public-directory publication. Plugin ID:
`plugin_asdk_app_6abd782c66c0819187dcd0b663352171`.

## Implemented release

`POST /api/mcp` uses the official MCP SDK's stateless Streamable HTTP transport.
Five read-only tools expose saved recipes (title search and detail), the user's
meal plan, pantry, and the canonical saved household grocery list. Tools return
only selected fields. They do not invoke Anthropic or create purchases, records,
notifications, or messages. Empty/missing lists remain empty; they are not
silently generated. Personal recipe and meal-plan access is deliberately limited
to the connected owner. Grocery v2 and meal-plan-servings migrations are required.

`/connect/marco` provides sign-in and consent, including approval and denial.
It has labelled fields, keyboard-focus controls, status/error announcements,
mobile layout, and zoom support. Apple-account users can sign in in a separate
Marco tab and resume. Real desktop/mobile OAuth testing is still required.

## Required OAuth setup before deployment

1. Choose the canonical public HTTPS Marco domain. Set `NEXT_PUBLIC_APP_URL` to
   that origin; the resource identifier is exactly `<origin>/api/mcp`.
2. In the existing Supabase project, enable OAuth Server, use asymmetric JWT
   signing, and configure the authorization path `/connect/marco` with the same
   Site URL. Use a **pre-registered public client** with PKCE and token endpoint
   authentication method `none`. Register the exact callback shown by the
   OpenAI setup UI; do not guess a callback or enable unrestricted DCR.
3. Review `supabase/migration-chatgpt-plugin.sql` against the production schema.
   It creates an allowlist/configuration table and token hook. It adds restrictive
   policies to existing public RLS tables and storage objects/buckets so plugin credentials cannot
   directly inherit normal database CRUD rights. Check exposed non-RLS tables,
   SECURITY DEFINER RPCs, and any other data paths before enabling access. The
   migration also installs a PostgREST pre-request guard to reject plugin tokens
   before RPC dispatch and refuses to replace a different pre-existing guard. Apply
   equivalent restrictions to future exposed tables. Do not run this migration
   blindly against an existing custom OAuth rollout.
4. Insert the registered OAuth client ID and exact resource URL into
   `public.marco_plugin_clients`. Set `MARCO_MCP_CLIENT_IDS` to that same ID.
   Enable `public.marco_plugin_access_token_hook` as the Supabase Custom Access
   Token hook. If a hook already exists, compose this logic with it rather than
   replacing it. The hook binds `aud` to the resource and adds `marco_access=read`.
   Normal browser tokens are unchanged. OAuth resource-parameter behavior must
   also be verified against the live Supabase version before submission.
5. Keep `MARCO_MCP_CLIENT_IDS` empty until the above is complete: MCP fails closed
   with 503. The server rejects ordinary login JWTs, unexpected clients, wrong
   audiences/issuers, expired tokens, and unsigned or incorrectly signed tokens.
   Existing cookie-authenticated server APIs reject plugin-marked credentials.
6. Test live OAuth discovery, PKCE, consent denial, successful connection, refresh,
   expiry, deletion, and grant revocation. The MCP route additionally calls Auth's
   `getUser` for online validation; verify actual revocation behavior on the live
   project. Never replace this with decoded, unverified JWT claims.

Supabase issuer: `<SUPABASE_URL>/auth/v1`. Discovery lives at
`<SUPABASE_URL>/.well-known/oauth-authorization-server/auth/v1`.
Marco advertises its issuer at `/.well-known/oauth-protected-resource` and in the
401 `WWW-Authenticate` challenge. Requested identity scopes are `openid email`;
Supabase OIDC scopes do not enforce database permissions. The resource-bound
claim and restrictive database policies enforce this integration's boundary.

## Local verification

Run `npm run test:plugin` on Node 22.18+ or Node 24, then `npx tsc --noEmit`
and ESLint on the changed files. Protocol tests use synthetic fixtures and the
real SDK transport. They do not connect to a production account. Tests cover
initialization, tool annotations, validation, bounded inputs, redacted errors,
JWT checks, first-party token rejection, ownership filters, shared list overrides,
and membership lookup failure. Live SQL/OAuth tests passed; see docs/plugin-review-results.md.

For local HTTP checks, configure a localhost `NEXT_PUBLIC_APP_URL`, the existing
Supabase public environment values, and a development client ID. No secrets go
in the plugin source. Use a separate development OAuth client and fixtures.

## Public package and listing

`plugins/marco/plugin.json` is a **draft source manifest** with ACGC attribution,
free-release description, three prompts, five positive and three negative review
cases, and release notes. Those review cases have **not been run in ChatGPT**.
`assets/marco.png` reuses the app's 512px icon. Optional dark-mode assets and
brand colors have not been added.

Do not export a skills-only ZIP from this source: its promised functionality
requires the MCP connection. The deployed HTTPS endpoint has been verified and
root `mcp.json` now uses schema
`https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`, server name `marco`,
type `streamable-http`, and that verified URL. Do not add `.app.json`, hooks,
credentials, or app bindings to the author-supplied public upload.

Before packaging, collect and verify:

- ACGC's verified individual/business identity in the intended OpenAI organization.
- Country availability and the dashboard-supported category.
- Public website, support, privacy, and terms URLs. Existing source has privacy
  and terms pages, but its support mailbox and plugin data coverage are unverified.
  The support page uses a different contact from the privacy policy. Confirm
  the canonical contact before public submission. Attempts to fetch the current
  Vercel homepage and policy/support URLs through the web tool were unsuccessful;
  this does not establish that the site is offline.
  Confirm contact, retention, deletion, and processor details before changing
  legal claims. Explain that requested cooking data is sent to OpenAI.
- An actual reviewer-accessible demo recording and dedicated demo credentials.
  Credentials belong only in secure portal fields, never in this source or ZIP.
- Commerce declaration matching the portal's current schema. User requested a
  free plugin; no checkout or Plus requirement is implemented.

Populate those values in `extensions.com.openai.interface`, `review`, and
`publication` before final ZIP validation. Omitted fields are unresolved, not
verified. Keep the subtitle at most 30 characters and prompts at most 128.

## Demo and review sequence

Use a dedicated fixture account with Weeknight Pasta, a planned dinner on
October 1, 2026, rice in the pantry, and a household grocery list for that date.
Rehearse the five prompts in the manifest in a ChatGPT development connection.
Show the consent screen, returned ingredients/steps, planned dinner, pantry,
and grocery override. Finish with the unsupported purchase request. Record real
interactions with readable results, excluding passwords and unrelated data.
Verify playback and host the recording where reviewers can access it. A script
is not a completed recording. Record each case as Passed, Failed, Blocked, or
Not run; see plugin-review-results.md for API results and ChatGPT rehearsal evidence.

Once preparation is complete, upload a draft in the intended OpenAI organization,
connect the real MCP endpoint, verify the saved metadata, and run the portal's
checks. Use `OPENAI_APPS_CHALLENGE` to serve the portal's exact domain-verification
token at `/.well-known/openai-apps-challenge`. Developer attestations must be
completed by the authorized publisher. Draft upload, submission for review, and
publication of an approved release are separate steps. None has occurred yet.

## References

- https://developers.openai.com/plugins/build/plugins
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/deploy/submission
- https://developers.openai.com/plugins/plugin-guidelines
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- https://supabase.com/docs/guides/auth/oauth-server/token-security

The linked X post could not be retrieved; no implementation decision depends on it.
