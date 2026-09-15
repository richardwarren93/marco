# Marco — End-to-End Experience Flow

The canonical, living description of the Marco "kitchen is home" experience, from
first-ever open through steady state. We build it **one beat at a time**; this doc
is updated as each beat lands. Design principles: the world **mirrors** real
cooking (never substitutes it), reward *cooking* not app-opens, **transformation
over accumulation**, SVG+CSS only, no currencies/XP-grind.

Related: build plan in `.claude/plans/fancy-mapping-lamport.md`; deterministic
engines in `src/lib/skills.ts` + `src/lib/progression-engine.ts`.

---

## The through-line (settled)

- **Onboarding is a guided walk-through, not a real cook.** Marco *shows you
  around* his kitchen with **Continue** taps. It opens on his first words and
  ends on a **real payoff**.
- **Onboarding's last beat is a genuine herb sprout** — the exact same
  `runProgression()` a real cook fires, called with `totalCooks = 1`. The first
  sprout is *earned with Marco*, "as if you'd just cooked a meal" — not a canned
  preview. Their kitchen really starts one step in (`herb: 0 → 1`); their first
  *real* cook advances it (`1 → 2`). No reset, no "that was just a demo."
- **Onboarding and the just-in-time zone reveals are ONE system** — a sequence of
  "Marco moments" gated by flags/milestones. Onboarding = the first beats; zones
  (bookshelf, fridge, groceries…) get introduced later, when the user's real next
  need calls for them. Building the payoff loop gets onboarding's climax for free.
- **Navigation: bottom bar is primary; kitchen zones are a bonus** path in.
- **Tomatoes = Marco's life**, not a currency. His mood tracks real cooking
  cadence; the spendable balance is retired from this surface.

---

## Phase 0 — First open (onboarding walk-through)

Guided, tappable, all inside the real kitchen scene. Marco introduces the world
and hands off to the first real suggestion. Beats:

1. **Meet Marco.** *"Welcome to your starter kitchen — let me show you around."*
   Bubble above Marco, tail down to him; he's grounded on the floor. → advances. ✅ built
2. **The loop, in one breath.** *"I'll suggest one thing to cook → you cook it →
   your kitchen grows with you."* (No jargon, no zones dumped at once.)
3. **The essentials only** — reuse existing onboarding steps that actually change
   suggestions: weekly goal, allergies, dietary, taste. Kept lightweight.
4. **The earned sprout.** Marco: *"Ready? Let's make this kitchen yours."* → fires
   the REAL `herb: 0 → 1` write, staged exactly like a post-cook payoff (camera
   favors the window, Marco reacts): *"There — that's your first. It grows every
   time you actually cook. Speaking of…"*
5. **Hand-off to the real loop.** *"…here's a real one for whenever you're ready"*
   → the first genuine suggestion in the real kitchen.

The **first real cook** (later, for real) is what advances the herb further and
starts the steady-state rhythm.

## Phase 1 — Steady-state kitchen home ✅ BUILT

The illustrated, evolving kitchen *is* home. Full-bleed art, Marco grounded with a
conversational bubble, a simple weekly goal line, bottom nav. No plan tonight →
Marco offers to find a recipe; plan set → the plan card. Zones are tappable as a
bonus path; bottom nav is primary.

## Phase 2 — The payoff loop (cook → visible change) 🔨 IN PROGRESS

The emotional core. Real cook → completion → the kitchen changes.

- Cook the suggestion → **"I made it!"** is the one true completion.
- Completion screen: **1–3 skills practiced** → **weekly-goal progress** →
  **optional photo** ("one for the cookbook?", never blocking) → **future-kitchen
  tease**: *"Keep this up and you'll unlock whole new kitchens — Tuscan, seaside,
  Tokyo… oh — I'm getting ahead of myself 😅. One meal at a time."* → **"Something
  changed in your kitchen."**
- Return to the kitchen → **the herb/window zone transforms** (reveal, never
  "spot the difference"; camera favors the window, Marco reacts).

## Phase 3 — The just-in-time zone reveals (guided-journey engine)

Same Marco-moment system as onboarding. Zones unlock *when the user's real need
arrives*, introduced by Marco — never a padlock wall:

- **Bookshelf → Recipes/Collections** — when they love a dish / want to save one.
- **Fridge → Weekly Plan** — after a couple of cooks, when planning ahead helps.
- **Groceries** — when a plan exists and a shopping list is useful.
- **Window/Herb** — the consistency zone, already live from Phase 2.

## Long arc

Sustained cooking fills the herb window (→3), then future kitchens
(Tuscan/seaside/Tokyo) become the next horizon. Skills accrue toward identity
("you're becoming a confident searer"). Kitchen decoration is per-kitchen; skills
/ photos / recipes persist across kitchens.

## Future direction — smart, all-meal cook loop

The cook loop must NOT stay dinner-only. The rest of the app already spans meals:
`meal_plans.meal_type` and the meal planner handle breakfast/lunch/dinner today.
Only the new `/api/cook/*` decision loop is temporarily narrowed — `mealType` is
a first-class field in `CookContext`, but the callers (`/api/cook/home`,
`/api/cook/suggest`, the home meal-plan query) hardcode `"dinner"` as a v1
simplification. "Smart" = Marco picks the RIGHT meal by context (time of day,
what's already planned, weekday vs weekend patterns) instead of assuming dinner.
Copy is already meal-agnostic ("meals a week", not "dinners"). Constraint to
revisit: `cooking_goals.weekly_target CHECK (<= 7)` assumes ≤1 cook/day — a
multi-meal loop may exceed 7/week and need that cap lifted (migration).

---

## Deterministic rules (canonical — `src/lib/`)

**Herb/window zone** (`progression-engine.ts`, monotonic — only grows):
- `1` sprout — your first cook ever (also onboarding's payoff)
- `2` healthy herb — the first week you hit your weekly goal
- `3` full window garden — a sustained month (`totalCooks ≥ max(8, target×4)`)

**Skills** (`skills.ts`) — 12 techniques inferred from recipe steps/tags/title;
mastery is a label, never a number: `started → practicing → comfortable →
confident → experienced` (at 1 / 2 / 4 / 8 / 15 experiences).

---

## Build order & status

1. ✅ **Steady-state kitchen home** (Phase 1).
2. 🔨 **The payoff loop** (Phase 2) — *this is also onboarding's climax.*
   - ✅ `src/lib/skills.ts` — technique taxonomy + inference + mastery.
   - ✅ `src/lib/progression-engine.ts` — cook → world-change, deterministic.
   - ✅ Goal line goal-gated + hardcoded `weeklyGoal: 3` retired.
   - 🟡 Apply `supabase/migration-kitchen.sql` — SQL handed to user; the route
     degrades gracefully until applied (computes results, persistence no-ops).
   - ✅ `POST /api/cook/complete` — the one true completion write-path.
   - ✅ Move the "cooked" event from cook-mode *entry* → the "I made it!" tap.
   - ⬜ Completion screen v2 (skills + goal + future-kitchen tease).
   - ⬜ Herb reveal in the kitchen (art states + camera + Marco reaction).
3. 🔨 **Guided-journey engine** (Phases 0 + 3) — onboarding beats + zone reveals.
   Lives INSIDE `/tonight` (never leave the kitchen): `KitchenOnboarding.tsx` runs
   the walkthrough over the kitchen backdrop; essential beats reuse the existing
   full-screen steps. Triggered by `?onboarding=1` for now; real first-run
   detection (`user_profiles.onboarding_completed`) lands once beats are built.
   - ✅ Scaffold + beat sequencer (space → welcome → goal → household →
     allergies → dietary → taste → import → sprout → handoff).
   - ✅ Beat: **space cold-open** — a zany SVG/CSS intro: Marco's rocket drifts
     toward a far-off glowing moon (the "lunar kitchen", deliberately never shown
     up close). *"A long long time ago, in a galaxy far away… oh never mind, we'll
     get there once you've cooked enough 🚀"* → lands in the starter kitchen.
     Plants the future-kitchen aspiration as a running gag that pays off at the
     sprout ("getting ahead of ourselves"). No art render (all SVG/CSS). Details:
     a big zany "Lunar Kitchen 🔒" signpost planted on the moon (the lock echoes
     "you're not ready yet"); on the last line the rocket turns around and
     free-falls (spin + tumble off-screen). As he falls, a gorgeous Tuscan villa
     (`public/kitchen/tuscan-home.png`, MJ) rushes up and HOLDS full-screen — a
     real beat with a "Tuscan Kitchen 🔒" sign (echoes the Lunar one) and a Marco
     line: *"Oh, isn't this lovely? …but we're not ready for this one yet."* A tap
     then cuts to the humble starter kitchen (villa covers the screen until the
     cut — no space-scene flash). Lands in STARTER (the real one); Lunar (absurd
     far-off gag) + Tuscan (near-term dream) stay locked future kitchens.
   - ✅ Beat: **welcome** (in-kitchen bubble).
   - ✅ Beat: **goal** (kitchen-native tray, saves `cooking_goal`).
   - ✅ Beat: **household** (number tray → `/api/onboarding/household`, sets
     `user_preferences.household_size` — the meal planner's default servings).
   - ✅ Beat: **allergies** (kitchen-native chip tray → `/api/user/allergies`).
   - ✅ Beat: **dietary** (kitchen-native chip tray → `/api/user/dietary`; now a
     REAL selector — old `DietaryFlagStep` was only a splash that collected
     nothing, so the engine's dietary hard-filter never had data).
   - ✅ Beat: **taste** — dimmed-kitchen "spotlight" + a "this or that" game:
     Marco lowers the lights, then 5 forced-choice matchups ("which sounds better
     tonight?", each probing a flavor contrast). Winners' `flavorWeights` average
     → 0–100 scores, cuisines tally → `/api/taste-profile/retune` (seeds the cook
     engine). Forced choice > "pick what you like" for signal + game-feel. No
     separate reveal (sprout is the payoff); no new art (scrim over the kitchen).
   - ✅ Beat: **import** — kitchen-native tray: Marco offers the seed recipe
     ("Hot Honey Beef Taco Bowls", can't-fail default → `/api/recipes/save`) plus
     "add your own" via 🔗 link (`/api/onboarding/import-recipes`) or 📷 photo
     (`extract-image` → `save`). All persist to the real cookbook. Captures the
     saved recipe (id/title/steps) into `firstRecipe` for the guided cook + sprout.
   - ✅ Beat: **bookshelf reveal** — `ZoomFrame` camera-pushes into the existing
     kitchen shelf (kept angled = continuity, not a separate straight-on shelf);
     the recipe just added pops on as an SVG cookbook (`ShelfBook`). *"That recipe
     just landed on your shelf — a little bare, it fills up as you save more."*
     (Shelf-filling progression is a later phase; SVG book-spines pop in on save.)
   - ✅ Beat: **guided cook** — `GuidedCook`: rebuilt on the real `CookMode`
     structure so it FEELS like following a recipe — full-screen cream (not a card
     over a dimmed kitchen), header (recipe name + "Step X of N" + Marco), progress
     dots, **Prep · Cook · Plate track row**, **completed-steps struck-through
     stack**, active card w/ tomato rail, and an **up-next** preview. AUTO-TURNS
     (progress bar; tap to skip). Each active step shows its **animated action
     icon** (pan sizzles / knife chops / pot bubbles / spoon stirs, `stepAction`
     cook-beats-prep) with the food **tinted by ingredient** (`foodColor`), plus
     the **tokenized step** (amount + timer chips, `parseStep`). Ends on "You made
     it! 🎉 → See my kitchen". A demo — no real cooking, no MJ. Flows into the
     sprout (genuine `herb 0→1` via `/api/cook/complete`).
   - ⬜ Beat: **sprout** (fire real `herb 0→1` + reveal; pairs with herb art).
   - ⬜ Beat: **handoff** (land in kitchen with first suggestion).
   - ⬜ Polish: disable zone hotspots during onboarding; real first-run gating.

## Beat log

- **Phase 0 · Beat 1 (Meet Marco):** after the space cold-open lands, Marco greets
  from his kitchen — *"Welcome to your starter kitchen! First, a little
  housekeeping…"* (leads honestly into the essentials, not a tour). Bubble ABOVE
  Marco, tail down, Marco grounded beneath. "Let me show you around" is saved for
  the later just-in-time zone reveals (Phase 3), when he actually walks you to a
  zone. (`showMarco={false}` on KitchenScene so the caller pairs Marco + bubble.)
- **Weekly-goal line is goal-gated:** `/api/cook/home` now reads the real
  `cooking_goals.weekly_target` and returns `hasGoal`; the "X of Y meals" line
  only renders once a goal exists. Before onboarding sets one there's no goal, so
  nothing shows (no fake "0 of 3"). Also retires the hardcoded `weeklyGoal: 3`.
- **Deterministic core:** `skills.ts` + `progression-engine.ts` landed, typecheck
  clean. The shared brain for both the payoff and onboarding's sprout.
- **Completion write-path:** `POST /api/cook/complete` fires at "I made it!"
  (moved off cook-mode entry); runs the engine, persists skills + kitchen_state,
  returns what changed. Degrades gracefully until the migration is applied.
- **Onboarding decision:** lives inside `/tonight` (never leave the kitchen);
  essentials gathered first, then import (seeded + own), then the earned sprout.
- **Onboarding scaffold:** `KitchenOnboarding.tsx` walks welcome → goal → … over
  the kitchen backdrop. welcome + goal are real (goal saves); the rest are
  advance-only placeholders, built one at a time. Preview via `?onboarding=1`.
- **Kitchen-native essentials:** essentials reskinned to sit IN the kitchen —
  Marco asks in a bubble, a warm answer tray rises from the floor, the room stays
  behind (`Frame` scaffold). Goal beat done in this pattern.
- **Goal = cadence in DAYS:** the weekly goal is "how many days a week do you want
  to cook" (1–7, DB-capped), NOT a plate count. Copy standardized to "days" (goal
  bubble + home "X of Y days this week"), and `cookedThisWeek` now counts DISTINCT
  cook days (two cooks in a day = one). This is the consistency metric the herb
  milestone reads. (Cadence model chosen over literal meal-counting; see Future
  direction for the smart all-meal loop.)
