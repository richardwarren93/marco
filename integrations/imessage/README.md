# Marco iMessage prototype

Photon project: c3b111c1-1414-477e-bcf1-d09eeab35e70. Stable Spectrum SDK 12.10.1.

The local `marco-test` scaffold owns its SDK install and Photon credentials. The tracked bridge calls Marco's signed `/api/imessage/message` endpoint. Run from that directory with `bun --env-file=../.env.local --env-file=.env src/index.ts`. Environment files are never committed or printed. The server service-role key derives a purpose-specific HMAC credential locally; the service-role key itself is never sent to the bridge endpoint.

`worker.ts.example` is the tracked copy of the scaffold's `src/index.ts`. Copy it there when recreating the scaffold. Keep both in sync when changing the worker.

Structured recipe data is parsed directly without an AI call. Text-only pages use the existing Anthropic account as a fallback. On 1 October 2026 its configured credit balance was exhausted, so that fallback could not be verified successfully; structured extraction and saving passed with a real public recipe page.

Apply `supabase/migration-imessage.sql` before deploying the API. All three tables have RLS enabled and are accessible only to service_role. Pairing requires a signed-in web session plus sending a random, single-use, 10-minute code from the iMessage sender. Sender handles are stored as hashes. Disconnect through `/connect/imessage` or text STOP. Direct messages and group recipe links are supported. Each link saves to the sender's linked Kitchen. Send one URL on its own or with "save". Outbound messages and unrelated group chatter are ignored. Group confirmations omit private recipe titles and IDs. Pairing and disconnecting require a DM; a connection code posted in a group is invalidated. Signed group context scopes receipts to the conversation.

The worker processes one message at a time. Message IDs are deduplicated in Postgres before side effects. If a worker/server crashes after claiming a message, that delivery is not automatically reprocessed; the user must resend. Saving a URL already present in the account returns the existing recipe. This local prototype is not an always-on production worker or a reminder scheduler. It stops when the process/computer stops.

Saving supports public HTTPS HTML recipe pages, including rich-link messages. A pinned public IPv4 address is used for every redirect; no credentials, images, or page subresources are fetched. Extraction must use explicit recipe content and schema validation. Social videos/private pages may require the app's importer instead. Daily limit: 30 inbound messages per sender; STOP remains available after the limit.

Tests: `node --experimental-strip-types --test tests/imessage/*.test.ts` from the Marco root; `bun node_modules/typescript/bin/tsc --noEmit` from the scaffold.
