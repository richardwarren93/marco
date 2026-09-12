// The Marco cooking decision engine.
//
// Pure scoring + recommendation + online learning — NO I/O. Callers load the
// candidate recipes, the user's context, and their learned profile, pass them
// in, and persist whatever comes back (the chosen suggestion as a cook_event,
// the updated profile). Same shape as Stride's rule-based engine: context in →
// score options → recommend the one thing → learn from what happened.
//
// v1 is deterministic and cheap (a weighted score over structured catalog
// fields). The LLM is NOT in this hot path — reasoning is templated. That's what
// makes nightly recommendations effectively free.

// ── Inputs ───────────────────────────────────────────────────────────────────

export type TimeBudget = "quick" | "medium" | "long"; // ≤20 / ≤40 / 40+ min
export type Energy = "low" | "medium" | "high";
export type IngredientMode = "have" | "shop" | "either";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface CookContext {
  timeBudget: TimeBudget;
  energy: Energy;
  ingredientMode: IngredientMode;
  dayOfWeek: number; // 0 (Sun) – 6 (Sat)
  mealType: MealType;
  pantry?: string[]; // normalized ingredient names the user has on hand
  expiringSoon?: string[]; // subset of pantry about to spoil (future: needs expires_at)
  recentRecipeIds?: string[]; // recently cooked/suggested — anti-repeat
  allergens?: string[]; // normalized; HARD filter
  dietary?: string[]; // vegetarian | vegan | gluten_free | dairy_free | low_carb — HARD filter
}

export interface FlavorVector {
  sweet?: number;
  savory?: number;
  richness?: number;
  tangy?: number;
  spicy?: number;
}

export interface CookProfile {
  cuisineAffinity: Record<string, number>; // -1..1
  ingredientScores: Record<string, number>; // -1..1
  flavor: FlavorVector; // 0..100 per axis
  effortTolerance?: { weeknightMinutes?: number; weekendMinutes?: number };
  noveltyPref: number; // 0 = repeat favorites .. 1 = crave variety
  adventurousness: number; // 0..1
  skillLevel: number; // 1..5
}

/** The subset of a catalog_recipes / recipes row the engine needs. */
export interface EngineRecipe {
  id: string;
  title: string;
  cuisine?: string | null;
  difficulty?: number | null; // 1..5
  totalTimeMinutes?: number | null;
  mealType?: string | null;
  flavor?: FlavorVector | null; // 0..100
  dietaryFlags?: string[] | null;
  primaryProtein?: string | null;
  keyIngredients?: string[] | null;
  tags?: string[] | null;
  avgRating?: number | null; // 1..5
}

// ── Outputs ──────────────────────────────────────────────────────────────────

export interface ScoredRecipe {
  recipe: EngineRecipe;
  score: number; // 0..1
  parts: Record<string, number>; // per-component contribution, for transparency/debug
}

export interface Recommendation {
  primary: EngineRecipe;
  backup?: EngineRecipe;
  reasoning: string;
  ranked: ScoredRecipe[];
}

// ── Tunables ─────────────────────────────────────────────────────────────────

const WEIGHTS = {
  cuisine: 0.22,
  effort: 0.2,
  flavor: 0.2,
  ingredient: 0.15,
  novelty: 0.1,
  pastSuccess: 0.08,
  spoilage: 0.05,
} as const;

const TIME_CAP: Record<TimeBudget, number> = { quick: 20, medium: 40, long: 999 };
const ENERGY_TARGET: Record<Energy, number> = { low: 15, medium: 30, high: 55 };

// ── Helpers ──────────────────────────────────────────────────────────────────

const norm = (s: string) => s.trim().toLowerCase();
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** map a -1..1 affinity to 0..1 (0.5 = neutral) */
const affist01 = (x: number) => clamp01((x + 1) / 2);

function anyKeywordHit(haystack: string[] | null | undefined, needles: string[]): boolean {
  if (!haystack) return false;
  const hay = haystack.map(norm);
  return needles.some((n) => hay.some((h) => h.includes(n)));
}

// ── Hard filters (never recommend these) ─────────────────────────────────────

export function passesHardFilters(r: EngineRecipe, ctx: CookContext): boolean {
  // Meal type must match if specified.
  if (r.mealType && ctx.mealType && r.mealType !== ctx.mealType) return false;

  // Time cap — respect the user's budget with a little slack.
  const cap = TIME_CAP[ctx.timeBudget];
  if (r.totalTimeMinutes != null && r.totalTimeMinutes > cap * 1.15) return false;

  // Dietary: recipe must carry every dietary flag the user requires.
  if (ctx.dietary?.length) {
    const flags = (r.dietaryFlags ?? []).map(norm);
    for (const need of ctx.dietary.map(norm)) {
      if (!flags.includes(need)) return false;
    }
  }

  // Allergens: exclude if any allergen appears in key ingredients or protein.
  if (ctx.allergens?.length) {
    const needles = ctx.allergens.map(norm);
    if (
      anyKeywordHit(r.keyIngredients ?? [], needles) ||
      (r.primaryProtein != null && needles.some((n) => norm(r.primaryProtein!).includes(n)))
    ) {
      return false;
    }
  }
  return true;
}

// ── Component scorers (each returns 0..1) ────────────────────────────────────

function cuisineFit(r: EngineRecipe, p: CookProfile): number {
  if (!r.cuisine) return 0.5;
  const a = p.cuisineAffinity[norm(r.cuisine)];
  return a == null ? 0.5 : affist01(a);
}

function effortFit(r: EngineRecipe, ctx: CookContext, p: CookProfile): number {
  const target =
    p.effortTolerance?.weeknightMinutes ?? ENERGY_TARGET[ctx.energy];
  const t = r.totalTimeMinutes ?? target;
  const timeScore = 1 - clamp01(Math.abs(t - target) / Math.max(target, 20));
  // Difficulty vs. energy/skill: low energy wants easy; don't exceed skill+1.
  let diffScore = 1;
  if (r.difficulty != null) {
    if (ctx.energy === "low" && r.difficulty >= 4) diffScore = 0.3;
    if (r.difficulty > p.skillLevel + 1) diffScore = 0.4;
  }
  return clamp01(0.6 * timeScore + 0.4 * diffScore);
}

function flavorFit(r: EngineRecipe, p: CookProfile): number {
  const axes: (keyof FlavorVector)[] = ["sweet", "savory", "richness", "tangy", "spicy"];
  let sum = 0;
  let n = 0;
  for (const ax of axes) {
    const rv = r.flavor?.[ax];
    const pv = p.flavor?.[ax];
    if (rv == null || pv == null) continue;
    sum += 1 - Math.abs(rv - pv) / 100;
    n++;
  }
  return n === 0 ? 0.5 : clamp01(sum / n);
}

function ingredientFit(r: EngineRecipe, ctx: CookContext, p: CookProfile): number {
  const keys = (r.keyIngredients ?? []).map(norm);
  // Affinity component (does the user like these ingredients?).
  let aff = 0.5;
  if (keys.length) {
    const scores = keys.map((k) => p.ingredientScores[k]).filter((x): x is number => x != null);
    if (scores.length) aff = affist01(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  // Availability component (only matters when cooking from what they have).
  let avail = 0.5;
  if (ctx.ingredientMode === "have" && keys.length && ctx.pantry?.length) {
    const have = new Set(ctx.pantry.map(norm));
    avail = keys.filter((k) => have.has(k)).length / keys.length;
  }
  return clamp01(0.5 * aff + 0.5 * avail);
}

function spoilageFit(r: EngineRecipe, ctx: CookContext): number {
  if (!ctx.expiringSoon?.length) return 0;
  const keys = (r.keyIngredients ?? []).map(norm);
  const expiring = new Set(ctx.expiringSoon.map(norm));
  return keys.some((k) => expiring.has(k)) ? 1 : 0;
}

function noveltyFit(r: EngineRecipe, ctx: CookContext, p: CookProfile): number {
  const recentlySeen = ctx.recentRecipeIds?.includes(r.id) ?? false;
  if (recentlySeen) return 1 - p.noveltyPref; // craves variety → penalize repeats
  return 0.5 + 0.5 * p.noveltyPref; // fresh option, rewarded more for variety-seekers
}

function pastSuccessFit(r: EngineRecipe): number {
  if (r.avgRating == null) return 0.5;
  return clamp01((r.avgRating - 1) / 4); // 1★→0, 5★→1
}

// ── Scoring + recommendation ─────────────────────────────────────────────────

export function scoreRecipe(r: EngineRecipe, ctx: CookContext, p: CookProfile): ScoredRecipe {
  const parts = {
    cuisine: cuisineFit(r, p) * WEIGHTS.cuisine,
    effort: effortFit(r, ctx, p) * WEIGHTS.effort,
    flavor: flavorFit(r, p) * WEIGHTS.flavor,
    ingredient: ingredientFit(r, ctx, p) * WEIGHTS.ingredient,
    novelty: noveltyFit(r, ctx, p) * WEIGHTS.novelty,
    pastSuccess: pastSuccessFit(r) * WEIGHTS.pastSuccess,
    spoilage: spoilageFit(r, ctx) * WEIGHTS.spoilage,
  };
  const score = Object.values(parts).reduce((a, b) => a + b, 0);
  return { recipe: r, score, parts };
}

/**
 * The core call: given tonight's context, the learned profile, and candidate
 * recipes (catalog + saved), return the ONE suggestion (+ a backup) with warm,
 * templated reasoning.
 */
export function recommend(
  candidates: EngineRecipe[],
  ctx: CookContext,
  p: CookProfile
): Recommendation | null {
  const rank = (c: CookContext) =>
    candidates
      .filter((r) => passesHardFilters(r, c))
      .map((r) => scoreRecipe(r, c, p))
      .sort((a, b) => b.score - a.score);

  // Fallback so there's (almost) always something to cook: if nothing fits the
  // time budget, relax TIME only ("long" cap is effectively unlimited) — never
  // allergens or dietary, which stay strict. Only truly empty when the catalog
  // has no allergen/diet-safe recipe for the meal.
  let usedCtx = ctx;
  let ranked = rank(ctx);
  if (ranked.length === 0 && ctx.timeBudget !== "long") {
    usedCtx = { ...ctx, timeBudget: "long" };
    ranked = rank(usedCtx);
  }

  if (ranked.length === 0) return null;

  const primary = ranked[0].recipe;
  const backup = ranked[1]?.recipe;
  return {
    primary,
    backup,
    reasoning: buildReasoning(primary, usedCtx, ranked[0].parts),
    ranked,
  };
}

/** Templated, warm reasoning — no LLM. Highlights the top reason this fits. */
export function buildReasoning(
  r: EngineRecipe,
  ctx: CookContext,
  parts: Record<string, number>
): string {
  // Reasoning is the "why this one" narrative — NOT the time/difficulty chips
  // (those render separately). Lead with whichever signal contributed most.
  const top = Object.entries(parts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (top === "spoilage" && ctx.expiringSoon?.length) {
    return `Uses your ${ctx.expiringSoon[0]} before it turns.`;
  }
  if (top === "ingredient" && ctx.ingredientMode === "have") {
    return "Mostly from what you already have.";
  }
  if (top === "cuisine" && r.cuisine) {
    return `${cap(r.cuisine)} — right up your alley.`;
  }
  if (ctx.energy === "low" || (r.difficulty != null && r.difficulty <= 2)) {
    return "A low-effort win for tonight.";
  }
  return "A good fit for tonight.";
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// ── Online learning (update the profile from a single event) ─────────────────

export type CookAction = "cooked" | "skipped" | "swapped" | "rated";
export interface LearnEvent {
  action: CookAction;
  recipe: EngineRecipe;
  reason?: string; // no_time | low_energy | missing_ingredients | not_feeling_it
  rating?: number; // 1..5 (for 'rated')
  context?: CookContext;
}

const LR = 0.12; // learning rate — gentle nudges

function nudge(map: Record<string, number>, key: string, delta: number) {
  const k = norm(key);
  map[k] = Math.max(-1, Math.min(1, (map[k] ?? 0) + delta));
}

/**
 * Return an updated profile after one event. Pure — the caller persists it.
 * Cooking is a strong positive; skips/swaps carry a *reason* that tells us how
 * to correct (the highest-signal input in the whole app).
 */
export function learnFromEvent(profile: CookProfile, e: LearnEvent): CookProfile {
  const p: CookProfile = {
    ...profile,
    cuisineAffinity: { ...profile.cuisineAffinity },
    ingredientScores: { ...profile.ingredientScores },
    flavor: { ...profile.flavor },
  };
  const r = e.recipe;
  const dir =
    e.action === "cooked" ? 1 :
    e.action === "rated" ? ((e.rating ?? 3) - 3) / 2 : // -1..1
    e.action === "skipped" || e.action === "swapped" ? -0.5 : 0;

  if (dir !== 0) {
    if (r.cuisine) nudge(p.cuisineAffinity, r.cuisine, LR * dir);
    for (const ing of r.keyIngredients ?? []) nudge(p.ingredientScores, ing, LR * dir * 0.6);
  }

  // Reason-aware corrections — the "what's getting in the way?" signal.
  switch (e.reason) {
    case "no_time":
    case "low_energy":
      // Bias toward simpler/faster next time.
      p.effortTolerance = {
        ...p.effortTolerance,
        weeknightMinutes: Math.max(10, (p.effortTolerance?.weeknightMinutes ?? 30) - 5),
      };
      break;
    case "not_feeling_it":
      if (r.cuisine) nudge(p.cuisineAffinity, r.cuisine, -LR); // stronger down-weight
      break;
    // "missing_ingredients" is handled upstream (bias ingredientMode='have'); no profile change.
  }

  return p;
}
