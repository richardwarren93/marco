# Household — Product Spec

**Status:** Strategy + MVP scope. Not yet implemented beyond the existing primitive.
**Audience:** Designers, engineers, and anyone joining the Salt & Spoon team.
**Owner:** Saptak.

---

## TL;DR

Salt & Spoon's structural differentiator from Recime, Paprika, Whisk, and every other recipe app is **the household** — a shared substrate that makes recipe-saving, meal-planning, cooking, and remembering collective by default. Today household exists as a backend primitive (schema, auth, shared grocery list) but is *invisible* in the UX. The work is to make household **ambient**: persistently present in the app, gently surfacing what your people are saving, planning, cooking, and remembering, without ever blocking you.

This is not a feature. It is a positioning bet.

---

## Why household is the differentiator

### The market gap

Every recipe app on the market is built like a single-player productivity tool. Recime, Paprika, Whisk, Yummly, Mealime — all assume one user managing their own recipes, their own meal plan, their own pantry. Shared lists exist in some (Whisk, OurGroceries) but they're utility-shared, not relationship-shared. They treat sharing as a *checkbox*, not a *substrate*.

That's a category-wide blind spot. **Most cooking is relational, not solo.** Dinner happens with someone — a partner, a family, roommates, friends. The app should reflect that.

### Why this is a moat, not a feature

Features can be copied in a sprint. Household-as-substrate cannot be retrofitted — it would require reshaping every other recipe app's data model, UX, and auth. Specifically:

1. **Switching cost compounds with members.** Migrating one user is easy. Migrating a household — partner, shared cookbook, shared meal plan, shared memories — is hell. Each added member multiplies retention.
2. **Local network effects.** Each member brings their own social graph. Households connect to other households via friends-of-friends. The graph grows naturally.
3. **Sentimental flywheel.** "We've cooked together 47 times this year." "Last year on this day, you and Sarah made apple pie." This data cannot be replicated by switching apps.
4. **Distribution flywheel.** Inviting a partner has a near-100% conversion rate (vs. inviting a random friend at ~5–10%). Each user brings 1–3 household members. Built-in 2–4× user acquisition multiplier.
5. **Defensible against AI commoditization.** Recipe extraction, cook mode, taste profiles, even chef personas will all be commodity AI features within 12 months. Household relationships and memory cannot be commoditized — they are shared and accumulated.

### Why it aligns with the brand

Salt & Spoon's emotional positioning is *cooking is a relationship, not a task*. Without household, that positioning is empty marketing copy. With household, the positioning is the product manifestation of the brand promise.

> "Salt & Spoon is the recipe app that feels like cooking with your people — not like organizing files."

---

## Mood & tone

Household is the warmest, most personal layer of the app. The tone in household contexts should always feel like:

- **A friend texting you, not a notification screaming at you.**
  - ❌ "NEW RECIPE SAVED BY SARAH"
  - ✅ "Sarah saved a pasta recipe for us — 2 hrs ago"
- **Quiet, never blocking.** Household activity is *ambient* — visible if you look, invisible if you don't.
- **Sentimental, not transactional.**
  - ❌ "Weekly stats: 5 meals completed."
  - ✅ "Five meals together this week. A good one."
- **Memory-aware.**
  - ❌ "Make this recipe again?"
  - ✅ "Last year on this day, you and Mark made apple pie. Want to do it again?"
- **Imperfection-friendly.** Cooking goes wrong. Household celebrates the messy ones too.
  - ✅ "Mark's bolognese took 3 hours longer than planned. Good story."

### Visual mood

- Warm color palette stays — cream `#F5EEE2` background, terracotta `#e8530a` accent. Household-specific UI leans deeper warm: muted gold for activity indicators, soft taupe for member avatars on a cream background. Never cool grays.
- Hand-drawn iconography ([src/components/icons/HandDrawnIcons.tsx](src/components/icons/HandDrawnIcons.tsx)) used for household-specific affordances (the "shared" toggle, household member avatars, the ribbon icon).
- Member avatars use a soft watercolor texture if a user hasn't uploaded a photo — never generic initials in a flat colored circle.
- The household ribbon (see below) feels like a small chalkboard at the entrance of a kitchen — warm, hand-lettered, low-key.

### Voice document

Every household-related string in the app should pass this test: *Does it sound like a friend in your kitchen, or like an enterprise SaaS notification?*

| Generic SaaS | Salt & Spoon |
|---|---|
| "User Sarah added a recipe to shared cookbook." | "Sarah saved this one — looked tasty." |
| "Your household completed 5 recipes this week." | "Five dinners cooked together this week. Keep it going." |
| "Notification: Mark started cooking." | "Mark's in the kitchen — pasta night." |
| "Failed to load household data." | "Couldn't reach your kitchen — try again?" |
| "Are you sure you want to leave this household?" | "Heading out? You'll lose access to our shared cookbook." |

---

## Where household shows up across the app

Five surfaces. Each gets a concrete household treatment.

### 1. Onboarding — household is the central question

**Today:** household is an optional sidebar in onboarding ([HouseholdStep.tsx](src/components/onboarding/HouseholdStep.tsx)). Size + type are captured but never persisted.

**Future:** household becomes the *anchoring* question of onboarding, not an afterthought.

```
Welcome to Salt & Spoon.

Who's at your table?
[ Just me ] [ My partner ] [ My family ] [ Roommates ] [ Mixed ]

Great. Are they here too? Want to invite them?
[ Skip for now ] [ Invite ]

What's everyone's flavor of "yes" tonight?
...
```

Why this matters: taste profile is a *consequence* of household, dietary needs, and what's on hand — not an independent variable. Asking household first reframes the whole entry experience.

### 2. Recipe saving — "Our Cookbook" by default

**Today:** every recipe is owned by a single user. No household scoping. Recipes are *not* shared across the household even when members are linked.

**Future:** every recipe save offers `Save to: [ Our cookbook ] [ Just for me ]`. Default to *Our* once a user is in a household. The "Just for me" toggle exists for surprise meals, anniversary recipes, and privacy edge cases.

- The cookbook UI gets two tabs: **Ours** and **Mine**. **Ours** is the default view.
- When a member saves a recipe, others see a quiet inline card in the **Ours** tab: *"Sarah saved this · 2 hrs ago"*.
- Optional reaction layer: a single heart from another member ("Mark hearted this"). No deeper social interaction needed.

### 3. Meal planning — assignable, shared, voting

**Today:** the meal plan calendar shows other household members' plans tagged with names (via [/api/meal-plan/household](src/app/api/meal-plan/household/route.ts)), but planning is still single-user.

**Future:** the calendar is *one shared object* with household-level affordances.

- **Assignable nights:** `Tuesday — Mark cooks`. Each meal slot can be tagged with the cooking member. Renders as a small avatar on the calendar.
- **Voting:** when undecided, post the night with options (`pasta or tacos?`). Members vote with a tap. Winner auto-confirms.
- **Reminders:** push notification at 5pm: *"Mark cooks tonight — pasta. Need anything from the store?"*

### 4. Cooking — household presence

**Today:** cook mode is solo. No awareness that another household member is cooking.

**Future:** household members see each other's cooking activity in soft real-time.

- When a member enters cook mode, others see a quiet ribbon: *"Sarah is in the kitchen — pasta · step 3 of 8"*.
- Tap to send a quick message ("can you grab the oregano?"). Uses the existing SMS handler ([src/lib/sms/handlers.ts](src/lib/sms/handlers.ts)) or in-app messaging.
- **Stretch:** two members cooking the same recipe simultaneously — synced timer, role split (one does veg, one does protein). Particularly compelling for long-distance couples cooking together.

### 5. Motivational / memory — the household ribbon and digest

**Today:** nothing. No retrospection, no memory, no celebration of cooking together.

**Future:**

**The Household Ribbon** — a persistent UI element at the top of the home tab.

```
┌──────────────────────────────────────────────────────────────┐
│  Tonight: Mark's pasta  ·  Sarah saved 2 recipes  ·  Week 3  │
└──────────────────────────────────────────────────────────────┘
```

Always present, never blocking. Tap to expand into a fuller view. Updates throughout the day as members save, plan, cook. This is the single most important UX addition for the "ambient" feeling.

**Weekly Digest** — every Sunday 7pm, a push notification or email:

> *Five dinners cooked together this week.*
> *Best-rated: Sarah's bolognese.*
> *Streak: 5 weeks of Sunday dinners.*
> *Want to plan next week together?*

**Memory layer** — calendar-aware nudges:

> *"Last year on this day, you and Mark made apple pie. Want to do it again?"*

---

## MVP scope — what to build first

In priority order. The goal: smallest change set that transforms household from a backstage primitive into a visible ambient layer.

### Phase 1 — Make household visible (estimated ~2 days)

1. **Persist onboarding metadata.** Add `households.size`, `households.type`, `households.dietary_preferences` columns. Store what we already collect. Use these to personalize recommendations and recipe filtering downstream.
2. **Recipes get an optional `household_id`.** Add the column (nullable — solo users unaffected). Add the **Save to: Our / Mine** toggle on save. Add the **Ours / Mine** tabs to the cookbook UI.
3. **Household activity feed.** New `household_activities` table (`member_id`, `action_type`, `entity_id`, `created_at`). Insert rows on key actions (save recipe, plan meal, complete cook). Surface in the household ribbon.
4. **The household ribbon component.** Persistent at the top of home + meal plan tabs. Shows: tonight's plan, who's cooking right now, 1-2 recent saves.

### Phase 2 — Make household interactive (estimated ~2 days)

5. **Household-aware meal plan slots.** Add `meal_plans.assigned_to_member_id`. Render assigned cook on the calendar. Push notification to the cook at 5pm.
6. **Cook mode presence.** Use Supabase Realtime to broadcast cook-mode state. Display "Sarah is in the kitchen" in the ribbon.
7. **Hearts / micro-reactions** on recipes saved by household members. Single tap, no comments.

### Phase 3 — Make household sentimental (estimated ~2 days)

8. **Weekly digest cron.** Sunday 7pm push / email summarizing the week with warmth, not stats.
9. **Memory nudges.** Calendar-aware: "Last year on this day…" prompts surfaced in the ribbon.
10. **Household-level dietary preferences.** Extend [src/lib/cook/dietary.ts](src/lib/cook/dietary.ts) so the household's combined constraints filter recipe suggestions by default.

**Total scope: ~6 days of engineering** for a complete ambient household experience. Plus design work for the ribbon and the voice/tone pass.

---

## Out of scope (deliberately deferred)

These are *not* in MVP. Each is genuinely good, but each adds complexity without proportional payoff right now.

- **Multi-household support** — a user in both their home household and their parents' household. Real life, but adds significant data-model and UI complexity. Defer to V2.
- **Granular roles** — adult / kid / roommate / guest with differentiated permissions (kids see no alcohol, etc.). Defer until we have actual household users telling us they need this.
- **Cross-household friend layer** — friends-of-household graph. Defer.
- **Synchronous long-distance cooking** — two people cooking the same recipe with shared timer in real-time. Magical but niche. Build after Phase 3.
- **Household-level subscriptions / billing** — pay once for the household. Important business question, but tied to monetization decisions not made yet.
- **Group SMS** — text Salt & Spoon in a family group chat; bot saves the recipe to everyone's cookbook. Genuinely unique but technically nontrivial (RCS vs SMS, group identity, opt-in). Build after household is solid.

---

## Strategic decisions to align on before building

These shape the implementation. The team should decide together, not assume.

1. **Single vs. multi-household.** Start single (simpler, stronger moat, current schema supports it). Anticipate multi in schema design — the `household_members` join table already does. Defer multi-household UX to V2.
2. **Privacy default.** Recipes default to household-shared once in a household, with a *Just for me* toggle. The default matters — most users won't change it. Better to be communal by default.
3. **Notification discipline.** Household activity will spam if every save triggers a push. Need:
   - Smart batching ("Sarah saved 3 recipes" not 3 separate pushes)
   - Quiet hours (no pushes 10pm–7am)
   - Per-category opt-outs (saves vs cooks vs meal plan vs digest)
4. **What does NOT go in household.** Friends graph, individual taste profile, personal onboarding state, individual notification preferences. Keep these personal even in household mode. Drawing this line clearly avoids feature creep.
5. **Naming.** "Household" is correct but cold. The app-facing word might be "Kitchen," "Our table," "Home," or something warmer. Worth designer + brand input. Internal/dev code stays `household`.

---

## Success metrics

How we'll know household is working as a wedge, not just a feature.

### Engagement metrics

- **% of new users who add a second household member** within 7 days of signup. *Target: 30%+ in first cohort.* This is the leading indicator of moat formation.
- **% of recipe saves that go to "Our" cookbook** (vs "Just for me"). *Target: 65%+.* Signals that household is the default mental model.
- **% of weeks where household has ≥2 meals cooked.** *Target: 50%+ of active households.* Indicates household is functionally shared, not just structurally.

### Retention metrics

- **30/60/90-day retention for users in a household** vs solo users. *Hypothesis: household users retain at 2× the rate.* If this is true, household is the moat. If it isn't, we're wrong about positioning.
- **Churn rate when a household member leaves.** Important to track — does losing one member cascade?

### Sentimental signals

- **Frequency of memory-nudge engagement** ("Last year on this day…" taps). High engagement here is the qualitative signal that we've nailed the warmth dimension.
- **Manual recipe annotations** ("Sarah said this needs more salt") per household. Indicates the household is becoming an active organism, not a passive container.

---

## Open questions for the team

These are intentionally unresolved. Bring them to the next planning conversation:

1. Do we lean into the "warm, sentimental" tone as far as feels comfortable, or do we hedge with a more neutral default? (My take: lean in. Hedging produces another beige recipe app.)
2. How do we handle the awkwardness of someone seeing their partner's saved recipes when one is a surprise? Is the *Just for me* toggle enough, or do we need a stronger "draft" / "private" mode?
3. Should the cook-mode presence indicator be opt-in per cook, or always on? (My take: always on within household, with a one-tap "going dark" mode for surprise cooks.)
4. What's the upgrade path from solo to household? Today users sign up solo and then create/join a household. Is there a moment in the existing user journey where we *prompt* solo users to add their household? (My take: yes — after the 3rd recipe saved, or at the start of meal planning.)
5. How does the chef persona ("Salt & Spoon") behave differently inside a household vs solo? Does it address the household collectively, or each user individually? (My take: addresses the household collectively when speaking ambient/digest, addresses you individually when you're alone in the app.)

---

## Related code & docs

- Current household primitive: [supabase/migration-household.sql](supabase/migration-household.sql)
- Existing household UI: [src/components/household/HouseholdCard.tsx](src/components/household/HouseholdCard.tsx)
- Onboarding flow with unused metadata: [src/components/onboarding/HouseholdStep.tsx](src/components/onboarding/HouseholdStep.tsx)
- Canonical-owner grocery model (good engineering pattern to extend): [src/lib/grocery-household.ts](src/lib/grocery-household.ts)
- Household-aware meal plan endpoint: [src/app/api/meal-plan/household/route.ts](src/app/api/meal-plan/household/route.ts)
- Brand voice + warm palette context: [src/app/globals.css](src/app/globals.css)
- Mobile shell context: [MOBILE.md](MOBILE.md)
