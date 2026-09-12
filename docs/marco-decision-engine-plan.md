# Marco v1 — The Cooking Decision Engine

## The pivot in one line
Marco is not a recipe library or a calendar. It's a **warm decision engine that gets you to cook and makes it feel rewarding** — and gets smarter every time you cook. (Recipes, plans, groceries are *inputs/outputs* to the loop, not the product.)

Same shape as Stride/Resil: **context in → score options → recommend the one thing → learn from what actually happened.** Stride does it for running load; Marco does it for "what do I cook tonight."

## The core loop (the whole product)
Every evening, in ~30 seconds:

**Check in (10s) → Marco decides (the ONE thing + a backup) → You cook → You're rewarded → Marco gets smarter.**

If that loop is magical and low-friction, nothing else matters. If it isn't, no feature saves it.

---

## The heart: the decision engine

A recommendation is a **scored ranking** over candidate recipes given tonight's context + a learned profile. v1 is **rule-based + light LLM** (transparent, cheap, no model training) — exactly like Stride's engine.

### Inputs
- **Tonight's context** (from the check-in): time budget (15 / ~30 / "up for it"), energy/mood, ingredient mode (use what I have / I can shop / either), day-of-week, meal type.
- **Learned profile** (updated from behavior): cuisine affinity, effort tolerance, ingredient likes/dislikes, novelty vs. favorites, day-of-week patterns ("Wednesdays are low-time"), cadence, skill signals, pantry + what's about to spoil.
- **Candidate pool:** the user's saved recipes + Discover/AI-generated options.

### Scoring (weighted, transparent)
```
score(recipe) =
    w1·cuisine_fit
  + w2·effort_fit(time, energy)
  + w3·ingredient_availability
  + w4·spoilage_use          (use the broccoli before it turns)
  + w5·novelty               (anti-repeat)
  + w6·day_pattern_fit
  + w7·past_success
  − penalties(recently_cooked, disliked_ingredient)
Hard filters: allergies, dietary flags, hard time cap.
```
→ top-1 = primary, top-2 = backup.

### Reasoning ("uses chicken you have and helps use your broccoli before it goes bad")
Template-first (cheap): `{time} min · {effort} · uses your {ingredient} · {benefit}`. Optional LLM enrichment for warmth — but keep it one cheap call or templated, since this runs nightly for every user.

### The learning update (the flywheel)
After each action, nudge the profile online (no training job):
- **Cooked** → bump cuisine + ingredient affinities; record effort success at that time/energy.
- **Skipped / swapped + reason** (the highest-value signal): 
  - "no time" → lower effort tolerance for this context
  - "low energy" → prefer simpler next time
  - "missing ingredients" → note pantry gap, bias toward pantry-first
  - "not feeling it" → down-weight that cuisine/recipe tonight
- **Rated / "too hard / just right / too easy"** → calibrate difficulty + affinity.

Every event is also written to an append-only log — the flywheel fuel *and* the training set for a learned model later.

---

## The fun data-capture loop (why the user stays invested)
The user only keeps teaching Marco if it's (a) low-effort, (b) rewarding, and (c) *visibly* pays off.

1. **The nightly check-in IS the sensor** — 2–3 tap-chip questions, warm framing, gets *shorter* over time (once it knows you, most nights it just shows the pick and lets you tweak). Never typing.
2. **The skip/swap "what's getting in the way?" screen is gold** — it captures *why*, framed as "help me get it right," not an error.
3. **Post-cook: "How'd it go?"** — loved it / good / meh (+ optional too-hard/just-right). One tap. Earns a reward.
4. **"What Marco's learned about you"** — periodic reveal ("you cook ~3 nights/week, love chicken + Asian, Wednesdays are harder…"), **editable** ("not quite? fix it"). This is the emotional payoff that makes sharing worth it — and each edit is more explicit data.
5. **Playful nudges** — "Marco noticed you skipped fish 3× — not your thing?" → one-tap confirm → engine updates. Feels like a friend paying attention.
6. **Rewards fund the flywheel** — tomatoes/streaks for check-ins, cooks, and feedback (you already built this). The reward loop *is* the investment loop.

Virtuous cycle: **teach Marco (fun) → better pick → cook (rewarded) → quick feedback (fun) → smarter engine → repeat.** Investment + relationship = retention + willingness to pay (the Finch model).

---

## Data model (the "cook context profile")
- **`cook_profile`** (per user): explicit prefs (allergies, dietary, dislikes, household, weekly goal, typical time) + learned vectors (cuisine_affinity, effort_tolerance, ingredient_scores, novelty_pref, day_patterns, cadence, skill_level) + pantry (items + expiry).
- **`cook_events`** (append-only log): every action `{ts, context_snapshot, recipe, action: viewed|assigned|cooked|skipped|swapped|rated, reason?, outcome?}`. Fuels learning now; trains a model later.

Build on what exists: `taste-profile`, `tasteInference.ts`, `cooking-log`, `allergies`, `meal-plan`, `tomatoes`/gamification.

---

## Build phases

### Phase 1 — Prove the loop *(ship first)*
Re-center the app around the daily loop; make Marco *decide* and *reward*.
- Re-centered **Home** = tonight's suggestion + streak/progress (demote library/calendar to tabs).
- **Nightly check-in** (screens 2 + 5): tap-chip context + skip/swap reasons.
- **Decision engine v1** (rule-based scorer + templated reasoning) over saved recipes.
- **One-suggestion screen** (3) with primary + backup + "make it easier / swap / missing ingredients."
- **Cook mode** (6) — mostly reuse.
- **Completion + reward** (7) — tie to tomatoes/streak/$ saved.
- **Event logging** — write every action to `cook_events` from day one (even before the engine uses it fully).
- **Success metric:** do people come back on cook-nights and cook *more* than before?

### Phase 2 — Marco visibly gets smarter
- Online profile updates from events (affinities, effort, day patterns).
- **"What Marco's learned about you"** screen (10), editable.
- Post-cook feedback + difficulty calibration.
- Playful nudges.
- **Success metric:** rec acceptance rate climbs over a user's first few weeks.

### Phase 3 — Mastery / coaching (the depth you described)
- Skill tracking: what you're good at vs. not (from completions, ratings, sous-chef reliance).
- Technique coaching + occasional stretch recipes ("you've nailed weeknight stir-fries — want to level up knife work?").
- **Success metric:** users report/feel they've become better cooks.

---

## Reuse / Build / Defer
| Reuse (re-point at the loop) | Build (new) | Defer |
|---|---|---|
| Recipe library → candidate pool | Decision engine (scorer + learning) | Skill-mastery coaching (Phase 3) |
| Taste profile / `tasteInference` → engine inputs | Nightly check-in flow | Deep social/friends layer |
| Meal plan → "if there's a plan" | `cook_events` logging | Trained ML recommender |
| Grocery → auto-list output | Re-centered Home + reward surface | |
| Tomatoes/gamification → reward system | "What Marco learned" reveal | |
| Sous-chef, AI import, mascot | Post-cook feedback | |

---

## The tightest v1 to validate the bet
Don't build all 10 screens. Ship the **loop skeleton**: warm home → 10-second check-in → *one* genuinely good rule-based suggestion (+ backup) → cook → reward → log the event. If people come back nightly and cook more, you've proven the category. Then layer the "visibly gets smarter" magic (Phase 2), which is what makes it a companion worth paying for.

## How this fixes monetization
A companion that gets you cooking and knows you earns a Finch-style subscription (~$40–50/yr) because there's nothing else like it. The library was a feature you had to discount; **the loop is a product people pay for.** Emotional + data lock-in >> recipe-library lock-in.
