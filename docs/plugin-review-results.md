# Marco submission preparation — September 30, 2026

## Verified

- Production: `https://marco-eta-lyart.vercel.app/api/mcp`, release 0.1.0.
- Publisher requested: ACGC; user confirmed intended legal identity. Portal identity verification remains pending.
- User chose all supported countries and `questions@windwalk.com` support.
- Free plugin; no Plus requirement or purchasing tools.
- Published and inspected all four unauthenticated listing pages: `/connect/about`, `/support`, `/privacy`, `/terms`. All identify Marco/ACGC and the confirmed support address. Privacy describes the plugin's OpenAI data sharing; retention details still require the publisher's answer.
- Draft archive: `.local-oauth-admin/marco-0.1.0-preparation.zip`. Inspected archive entries and parsed manifest/MCP contents: correct endpoint, 27-character subtitle, five positive and three negative cases, explicit unrestricted countries, four verified URLs, actual icon and skill. No secrets/app bindings. Demo field absent, so this archive is not submission-ready.
- OAuth configuration: registered public PKCE client, exact ChatGPT callback, dynamic registration disabled, audience-bound token hook, five read-only tools.

## Live test results

The live API tests used a dedicated synthetic reviewer account; no personal cooking data or account grants were modified. Credentials are outside the source/package in the ignored local administration directory and must only be entered in secure reviewer-access fields.

| Check | Result | Evidence |
| --- | --- | --- |
| Password login with enabled token hook | Passed | Isolated reviewer account authenticated |
| Consent denial | Passed | Callback returned `access_denied` with original state |
| PKCE code exchange | Passed | S256 flow issued a resource-bound token |
| Tool discovery | Passed | Exactly five tools; read-only=true, destructive=false, open-world=false |
| Recipe search | Passed | `pasta` returned seeded Weeknight Pasta ID |
| Recipe details | Passed | Seeded recipe returned to its owner |
| Meal plan | Passed | October 1–7 returned fixture dinner and correct recipe ID |
| Pantry | Passed | Returned seeded rice |
| Grocery list | Passed | Shared list returned oat milk override, checked=true; soft-deleted item omitted |
| Direct Data API | Passed | Plugin credential rejected |
| Token refresh | Passed | Refreshed token successfully discovered MCP tools |
| Grant revocation | Passed | Existing access token received 401; refresh received 400 |
| ChatGPT real-account recipe search/detail | Passed | Live connection returned saved banana-bread recipe |
| ChatGPT real-account empty states | Passed | Empty plan/pantry and absent grocery list accurately reported |
| ChatGPT unsupported actions | Passed, combined rehearsal | Declined buying groceries, saving a recipe, and cross-account pantry access; no tool activity shown |

The exact five fixture prompts and three individual negative prompts still need to be run against the saved submission version in the portal. The direct API assertions and combined ChatGPT rehearsal do not replace that step.

## Recording walkthrough

Use the isolated fixture account, not the personal account. Do not show passwords or the private credential file. The available browser control provides screenshots but no video recording capability.

1. Start a screen recording of the browser window after signing in. Hide unrelated tabs and chats.
2. Show Marco connected in ChatGPT, then ask “Find my saved pasta recipes in Marco.”
3. Ask “Show me the ingredients and steps for that Weeknight Pasta recipe.”
4. Ask “What have I planned in Marco from October 1 through October 7, 2026?”
5. Ask “What ingredients are recorded in my Marco pantry?”
6. Ask “Show my saved Marco grocery list starting October 1, 2026.” Show oat milk and its checked state.
7. Ask “Use Marco to buy my groceries and charge my card.” Show the refusal.
8. Stop recording. Play it back to check readable results and no credentials/private data. Host it at a reviewer-accessible URL and verify playback without sign-in before adding the URL to the manifest.

## Still required

- Confirm retention/deletion practices for records and logs; finish privacy review.
- Record, inspect, and host the real walkthrough. No demo URL has been invented.
- Recheck the privacy page after confirmed retention details are incorporated.
- Verify publisher identity/domain in the intended OpenAI organization.
- Enter reviewer credentials through secure portal fields and maintain fixture access.
- Upload the final package, connect the saved submission, run individual cases, resolve portal checks, and have the authorized publisher complete attestations.

No draft has been uploaded to the public submission portal, submitted for review, or published.

## v0.2.0 recipe saving and HTML cards

The historical read-only results above cover v0.1.0. The save-refusal case is
replaced in v0.2.0 by unsupported deletion. New positive cases cover previewing
without saving and explicitly saving after opt-in.

- Nine automated plugin tests pass: discovery/annotations, input validation,
  JWT/session boundary, owner scoping, shared grocery behavior, fail-closed
  permissions, confirmation, preview resource, and idempotent/concurrent saves.
- Targeted ESLint, TypeScript, and production build pass.
- Additive saving migration applied; existing accounts remain opted out.
- Deployed commit `c8197b2`; Vercel deployment `Gk1LHsqVy7o9cLc9jhqGXVr94nN9` reached Ready.
- Production isolated-account tests passed: seven tools, preview/resource,
  denial before opt-in, concurrent saves returning one owned recipe, stored
  content, duplicate retry, bearer self-enable rejection, foreign-origin
  rejection, and denial after disabling. The fixture permission was turned off
  and its test OAuth grant revoked afterward.
- Refreshed the existing private ChatGPT app tools and updated its description.
  `preview_recipe` rendered the synthetic Toast card in the real chat, with
  ingredients, Save to Marco, the opt-in link, and working expandable steps.
  Screenshot: `.local-oauth-admin/marco-recipe-card-chatgpt.png`.
- The existing account's permission page correctly shows saving off. No personal
  recipe was created. The card's save-button success path has not been tested
  in ChatGPT; the server save path was tested with the isolated account above.
- ChatGPT's existing custom-app CSP enforcement setting was off during this
  preview test and was not changed. Enforced-CSP host validation remains before
  public submission, even though the resource declares an empty network allowlist.
- The old v0.1.0 ZIP is obsolete; the v0.2.0 preparation archive supersedes it.
  It remains a draft without a recorded demo. Public submission is incomplete.
