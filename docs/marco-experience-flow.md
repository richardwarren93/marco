# Marco — the cook loop

What the cook loop actually does today. This file used to be "the canonical,
living description of the Marco 'kitchen is home' experience" — the illustrated,
evolving kitchen at `/tonight`, its zone reveals, future kitchens, and the
onboarding walk-through staged inside it.

**That direction is dead.** `/tonight`, `src/components/kitchen/`,
`src/lib/kitchen/scene.ts` and `public/kitchen/` were removed once the page
turned out to be unreachable (PR #106). `/kitchen` — a different, chaos-styled
home — superseded it. The old vision text is in this file's history if it is
ever wanted back; what follows is only what still exists in the code.

---

## Deterministic rules (`src/lib/`)

**Skills** (`skills.ts`) — 12 techniques inferred from recipe steps/tags/title.
Mastery is a label, never a number: `started → practicing → comfortable →
confident → experienced`, at 1 / 2 / 4 / 8 / 15 experiences. Live.

**Progression** (`progression-engine.ts`) — monotonic herb/window levels, only
ever grows:
- `1` sprout — first cook ever
- `2` healthy herb — the first week the weekly goal is hit
- `3` full window garden — a sustained month (`totalCooks ≥ max(8, target×4)`)

⚠️ **This engine is live but has no surface.** `POST /api/cook/complete` still
runs it and still persists `kitchen_state` on every cook. The only thing that
ever rendered those levels was the illustrated kitchen, so the numbers are now
written and never read. Either give them a surface or retire the engine — see
"Open questions".

## The completion write-path

`POST /api/cook/complete` is the one true completion write, fired by the
"I made it!" tap (deliberately not on cook-mode *entry*). It runs the engine,
persists skills + `kitchen_state`, and returns what changed. It degrades
gracefully while `supabase/migration-kitchen.sql` is unapplied: results are
computed, persistence no-ops.

## Goal = cadence in days

The weekly goal is "how many days a week do you want to cook" (1–7, DB-capped),
**not** a plate count. Copy says "days" throughout, and `cookedThisWeek` counts
DISTINCT cook days — two cooks in one day is one. This is the consistency metric
the progression milestones read.

`/api/cook/home` reads the real `cooking_goals.weekly_target` and returns
`hasGoal`; the "X of Y days this week" line renders only once a goal exists, so
there is no fake "0 of 3" before onboarding sets one.

## Future direction — smart, all-meal cook loop

The cook loop must NOT stay dinner-only. The rest of the app already spans
meals: `meal_plans.meal_type` and the meal planner handle breakfast/lunch/dinner
today. Only the `/api/cook/*` decision loop is narrowed — `mealType` is a
first-class field in `CookContext`, but `/api/cook/home`, `/api/cook/suggest`
and the home meal-plan query hardcode `"dinner"` as a v1 simplification.
"Smart" = Marco picks the RIGHT meal by context (time of day, what is already
planned, weekday vs weekend patterns) instead of assuming dinner. Copy is
already meal-agnostic ("meals a week", not "dinners").

Constraint to revisit: `cooking_goals.weekly_target CHECK (<= 7)` assumes ≤1
cook/day — a multi-meal loop may exceed 7/week and need that cap lifted
(migration).

---

## Open questions

- **`supabase/migration-kitchen.sql` may still be unapplied.** The last status
  recorded here was "handed to the user, not yet run", and the route is written
  to degrade gracefully, which fits. Not verifiable from the repo — check the
  database. While it is unapplied, `/api/cook/complete` computes progression and
  skills but persists nothing.
- **`progression-engine.ts` has no display surface** (above). Decide whether the
  herb model belongs somewhere in `/kitchen`, or whether the engine and
  `kitchen_state` should go the way of the art.
