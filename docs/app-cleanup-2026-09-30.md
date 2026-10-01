# Marco app cleanup — 30 September 2026

Status: implemented locally and verified; not committed, pushed, or deployed.

## Changes

- Meal plan and groceries use one compact page header and smaller week controls. Adding a meal keeps recipe search inside the sheet; the outbound multi-meal planning shortcut was removed from that sheet.
- Recipe detail prioritizes planning, cooking, ingredients, and instructions. Nutrition and cooks/photos are expandable, duplicate cooking calls to action were removed, and oversized image placeholders were reduced.
- Potluck is reached from Table, not a standalone dock tab. Real table potlucks can be created and receive one dish per member, with membership, dish ownership, and table validation.
- Table has explicit group selection plus create/join access. Posting a cook lets the user select its destination table.
- Kitchen displays the authenticated user's recipes, saved cooks, and posted cooks, with honest empty states.
- Table loading uses a single authenticated endpoint, batched membership data, parallel queries, and cached requests. Lineage counts load after the feed. No before/after production performance benchmark has been run.
- Onboarding collects a name and starting destination; completion is stored before navigation. Returning users skip completed setup and pending table invites survive.
- Shared client caches clear when the authenticated identity changes.

## Verification

- TypeScript check passed.
- Production build passed (149 pages). Existing workspace-root warning remains.
- Targeted lint passed for new API routes, Kitchen, Potluck, onboarding, table management, and Providers.
- Nine existing plugin regression tests passed.
- Local authenticated API checks passed for Table, Kitchen, and Potluck; anonymous access returns 401; foreign Table returns 404; invalid onboarding returns 400.
- Isolated reviewer account verified two groups, scoped feeds, potluck creation, successful submission, rejection of a dish from another table, and duplicate submission rejection.
- Browser checked onboarding completion, two-table creation, Kitchen data, inline meal search, recipe hierarchy, and groceries.
- Synthetic table/cook/potluck fixtures were added only to the existing reviewer account. Personal account records were not edited.
- Database compatibility finding: live cooks table lacks is_featured, so the feed scopes directly to owned cooks and joined tables instead.

## Still open

- Muse/Dot is an external service. Its exact product URL is needed before an integration can be designed. No in-app assistant or reminder scheduler was added.
- Explore recommendation: make it a focused recipe and cooking-class discovery page. Remove simulated local trends, sample follower counts, and inactive Follow controls. Explore has not been changed in this pass.
- Existing Instacart shopping-list endpoint remains unchanged; external-assistant grocery ordering is not implemented or tested.
- Visual changes await user review; production is unchanged.
