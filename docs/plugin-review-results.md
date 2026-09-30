# Marco submission preparation — September 30, 2026

## Verified

- Production: `https://marco-eta-lyart.vercel.app/api/mcp`, release 0.1.0.
- Publisher requested: ACGC; user confirmed intended legal identity. Portal identity verification remains pending.
- User chose all supported countries and `questions@windwalk.com` support.
- Free plugin; no Plus requirement or purchasing tools.
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
- Publish and verify all four listing pages after final policy changes.
- Verify publisher identity/domain in the intended OpenAI organization.
- Enter reviewer credentials through secure portal fields and maintain fixture access.
- Upload the final package, connect the saved submission, run individual cases, resolve portal checks, and have the authorized publisher complete attestations.

No draft has been uploaded to the public submission portal, submitted for review, or published.
