# Ratings: what's left to do, and what I changed

Companion to `SIMPLIFY.md` §Phase 4. Nothing here is committed. I only touched
`supabase/` and this file — no app code.

**One claim in SIMPLIFY.md is wrong and is corrected below:** the legacy rating
path was *not* dead on arrival. It was live for about three weeks.

---

## 1. Run this (the blocking step — it's yours, I have no DB access)

**Paste the whole of `supabase/migration-recipe-ratings.sql`** into the Supabase
SQL editor and run it. It is idempotent; running it twice is a no-op.

Then paste this to confirm it took:

```sql
SELECT
  (SELECT count(*) FROM pg_policies
    WHERE tablename = 'recipe_star_ratings')                AS policies,  -- expect 2
  (SELECT relrowsecurity FROM pg_class
    WHERE oid = 'public.recipe_star_ratings'::regclass)     AS rls_on,    -- expect t
  (SELECT count(*) FROM pg_index
    WHERE indrelid = 'public.recipe_star_ratings'::regclass
      AND indisunique)                                      AS uniq_idx,  -- expect 2 (pk + user/recipe)
  (SELECT count(*) FROM recipe_star_ratings)                AS rows_now;  -- expect 0 on a fresh run
```

If that returns `2 | t | 2 | 0`, ratings are live. Tell me and I'll verify the
three surfaces (§5).

---

## 2. Three things in the migration would have failed or silently misbehaved

I reviewed it line by line and fixed all three in place.

**(a) The last line could roll back the entire migration.** The file ended with
`DROP POLICY IF EXISTS "…" ON recipe_ratings;`. `IF EXISTS` covers the *policy*,
not the *table* — if `recipe_ratings` is absent (i.e.
`migration-collections-community.sql` was never run), that line raises `42P01`.
The Supabase SQL editor runs a paste as a single transaction, so an error on the
*last* statement rolls back the `CREATE TABLE` at the top. You would have seen
an error mentioning a table you don't care about, and been left with no
`recipe_star_ratings` at all. Now guarded with `to_regclass`.

**(b) A half-created table would break saving, not degrade it.**
`CREATE TABLE IF NOT EXISTS` is a silent no-op if the table already exists in a
*different* shape. The file header says an earlier version of this migration
collided with `recipe_ratings` by name, so a partial earlier state is plausible.
If that state lacked the unique index on `(user_id, recipe_id)`, the API's
`upsert(…, { onConflict: "user_id,recipe_id" })` fails with `42P10` — and
`isMissingTable()` only catches `42P01`, so POSTing a rating would 500 instead
of degrading gracefully. Added an idempotent guard that adds the constraint if
no such unique index exists.

**(c) No `updated_at` trigger.** The API sets `updated_at` explicitly on upsert
so this was never broken, but every other community table has the trigger. Added
it — itself guarded on `update_updated_at()` existing, so it can't become
failure mode (a) in a different costume.

**Things I checked that are correct:** `UNIQUE(user_id, recipe_id)` matches the
API's `onConflict` exactly (column order is irrelevant to `ON CONFLICT`
inference); `rating smallint CHECK 1..5` matches the route's integer 1–5
validation; the FKs to `auth.users(id)` and `recipes(id)` both cascade and
`recipes.id` is a `uuid` PK; the policies do what you want — `SELECT … TO
authenticated USING (true)` lets any signed-in user read all ratings, and
`FOR ALL … auth.uid() = user_id` with a matching `WITH CHECK` lets them write
only their own.

Worth knowing: **RLS here is defence-in-depth only.** Every read and write goes
through `createAdminClient()` (service role), which bypasses RLS entirely. The
real gate is the `401` check at the top of each handler in
`src/app/api/recipes/[id]/rating/route.ts`. That's fine — but it means a policy
mistake wouldn't show up in testing.

---

## 3. The legacy `recipe_ratings` rows: migrate them, but look first

**They are probably real, and SIMPLIFY.md is wrong about this.** It says the
legacy path was "dead on arrival" because `CommunitySection` was
`dynamic()`-imported but never rendered. That is true of the code *as it stands*
— but git says `<CommunitySection sourceUrl={recipe.source_url} />` was
genuinely rendered on the recipe detail page from `050830b` (2026-03-15) through
`eedffd9` (2026-04-05), for every recipe that had a `source_url`.
`CommunitySection` renders `RatingStars`, the only writer of `recipe_ratings`.
So users could rate for roughly three weeks, and those rows are the only record
of it.

**The suggested mapping doesn't work, and shouldn't.** Resolving `source_url` to
the representative `recipe_id` that `/api/recipes/discover` picks is not
reproducible in SQL, because that pick is:

- **by normalized title, not by URL** — one URL spans several title groups, one
  title group spans rows with different or `NULL` URLs, so the key spaces don't
  line up;
- **viewer-dependent** — `if (myTitles.has(normalizedTitle)) continue` skips any
  group the viewer already owns;
- **time-dependent** — rows are scanned `created_at DESC`, so the newest copy
  carrying an image becomes the representative.

There is no durable representative `recipe_id` to migrate onto.

**What I'd do instead:** send each legacy rating to the rater's *own* saved copy
of that URL. That is literally what was on screen when they rated — the widget
took `sourceUrl` from the recipe row being viewed — so it's a faithful
reconstruction, and it's deterministic in SQL. Effect: each user's star
reappears on their own recipe's detail page.

`supabase/migration-recipe-ratings-legacy.sql` does this in four steps.
**Step 1** counts what's there and how much resolves — if it returns
`total_legacy_rows = 0`, stop, there's nothing to salvage and the question is
closed. **Step 2** is a dry run showing every row that would move. **Step 3** is
the `INSERT`, commented out, additive only, with `ON CONFLICT DO NOTHING` so it
never overwrites a newer rating and is safe to re-run. **Step 4** verifies and
shows how to undo. Nothing in that file drops anything, and I left
`recipe_ratings` in place — it's orphaned in code, costs nothing, and is the
only copy of the rows whose rater no longer has that URL saved.

Run step 1 whenever; it's read-only and it answers whether the rest is worth it.

---

## 4. The real reason community ratings won't feel like they work

This one needs app code, so I left it alone — but it's the thing that matters
most once the table exists.

Discover attaches ratings with `ratingMap.get(r.recipeId)` — the single
representative row's ratings, not the group's. And the representative is
whichever copy in the title group was created most recently *and* has an image.
So **the moment any user saves a new copy of a recipe, the representative flips
to that new row and every accumulated community rating on the old one
disappears from Discover.** Ratings also never aggregate across the copies of a
recipe that different users saved, because each copy is a separate `recipes` row
with its own `id`.

The feature will work for a single recipe reached from Discover, and will
quietly lose its history over time. The fix is to aggregate over the whole title
group rather than the representative row (sum/count across every `recipe_id` in
the group), which is a change in `src/app/api/recipes/discover/route.ts` and
arguably in what `recipe_star_ratings.recipe_id` is meant to denote. Worth its
own pass.

---

## 5. Verification — status after you ran the migration

### Checked statically (no session needed) — all pass

- **Every column the code queries exists in the shipped DDL.** `readAggregate`
  selects `rating, user_id` filtered by `recipe_id`; the POST upserts
  `user_id, recipe_id, rating, updated_at` (leaving `id` and `created_at` to
  their defaults); Discover selects `recipe_id, rating`. No mismatch.
- **The widget is genuinely rendered** — not another imported-but-never-rendered
  component like the one Phase 4 deleted. `<RecipeRating recipeId={recipe.id} />`
  is at `src/app/recipes/[id]/page.tsx:1289`, inside the bottom sheet that the
  **Reviews** button at line 1054 opens. That button renders in the public view
  too, so it's there on other people's recipes.
- **The Discover chip is rendered** — `DiscoverRecipeCard.tsx:178` shows a gold
  star plus the average when `count > 0`, and a grey **New** pill when it's 0.
  `/discover` → `DiscoverTab` → that card is a live chain, and tapping a card
  routes to `/recipes/<representativeId>`.
- **The tomato award can't break saving.** `awardTomatoes` is non-throwing by
  contract and resolves to `{ awarded: false }` on any failure, so a missing
  gamification table can't 500 a rating. `TOMATO_REWARDS.RECIPE_RATING` (5) and
  `TOMATO_DAILY_CAPS.recipe_rating` (10) both exist.

### Still unconfirmed

The §1 query. "No rows returned" is the right answer for DDL, but it only proves
the script didn't error — not that the table, RLS and both unique indexes are
there. That query is the cheap way to know.

### If saving a rating 500s, it's probably the PostgREST schema cache

Worth knowing *before* you test, because it looks like a code bug. Immediately
after DDL, PostgREST can still be serving a cached schema and answers with
`PGRST205` ("Could not find the table … in the schema cache") rather than
Postgres's `42P01`. `isMissingTable()` in the rating route only checks `42P01`,
so that case skips the graceful 503 and returns a 500 "Could not save rating".
Supabase normally reloads within seconds; if it hasn't, run:

```sql
NOTIFY pgrst, 'reload schema';
```

### What only you can confirm (signed in)

I have no session, and both routes 401 without one, so I can't drive this from a
browser. Four steps:

1. Open `/discover` and tap any card — that opens **someone else's** recipe,
   which is what you want.
2. Tap **Reviews**, then tap a star. Expect the sheet heading to change to
   `5.0 · 1 rating` and a `🍅 +5` toast.
3. Reload the page. The star should still be filled and the Reviews row should
   read `5.0 (1)` — that's the write actually persisting.
4. Go back to `/discover`. That card should now show a gold `5.0` instead of the
   **New** pill.

Use `npm run build && npx next start`, not `next dev` — `next dev` on this
machine doesn't run `middleware.ts` (Next infers the wrong workspace root from a
stray `package-lock.json` in your home directory), so signed-out behaviour in
dev proves nothing.

One trap in step 4: don't tap **Save** on that card first. Saving creates your
own copy of the recipe, and Discover skips any title group you own
(`myTitles.has(normalizedTitle)`), so the card — chip and all — disappears from
your Discover entirely. That's §4's drift bug in miniature, and it's the
clearest way to see why it needs fixing.
