// Server-side glue between the pure decision engine (cook-engine.ts) and the DB.
// Loads candidates + the learned profile, logs cook_events, applies online
// learning. The engine stays pure; all I/O lives here.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  recommend,
  learnFromEvent,
  type CookContext,
  type CookProfile,
  type EngineRecipe,
  type FlavorVector,
  type Recommendation,
  type CookAction,
} from "@/lib/cook-engine";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SB = SupabaseClient<any, any, any>;

const norm = (s: string) => String(s || "").trim().toLowerCase();
const FLAVOR_AXES: (keyof FlavorVector)[] = ["sweet", "savory", "richness", "tangy", "spicy"];

const DEFAULT_PROFILE: CookProfile = {
  cuisineAffinity: {},
  ingredientScores: {},
  flavor: {},
  noveltyPref: 0.5,
  adventurousness: 0.5,
  skillLevel: 2,
};

function pickFlavor(obj: Record<string, unknown> | null | undefined): FlavorVector {
  const out: FlavorVector = {};
  if (!obj) return out;
  for (const ax of FLAVOR_AXES) {
    const v = (obj as any)[ax];
    if (typeof v === "number") out[ax] = v;
  }
  return out;
}

function catalogToEngine(r: any): EngineRecipe {
  return {
    id: r.id,
    title: r.title,
    cuisine: r.cuisine,
    difficulty: r.difficulty,
    totalTimeMinutes: r.total_time_minutes,
    mealType: r.meal_type,
    flavor: pickFlavor(r.flavor),
    dietaryFlags: r.dietary_flags,
    primaryProtein: r.primary_protein,
    keyIngredients: r.key_ingredients,
    tags: r.tags,
    avgRating: r.avg_rating,
  };
}

function rowToProfile(row: any): CookProfile {
  return {
    cuisineAffinity: row.cuisine_affinity ?? {},
    ingredientScores: row.ingredient_scores ?? {},
    flavor: row.flavor ?? {},
    effortTolerance: row.effort_tolerance ?? undefined,
    noveltyPref: row.novelty_pref ?? 0.5,
    adventurousness: row.adventurousness ?? 0.5,
    skillLevel: row.skill_level ?? 2,
  };
}

function profileToRow(p: CookProfile) {
  return {
    cuisine_affinity: p.cuisineAffinity,
    ingredient_scores: p.ingredientScores,
    flavor: p.flavor,
    effort_tolerance: p.effortTolerance ?? {},
    novelty_pref: p.noveltyPref,
    adventurousness: p.adventurousness,
    skill_level: p.skillLevel,
    updated_at: new Date().toISOString(),
  };
}

/** Seed a brand-new cook_profile from the user's existing taste_profile so the
 *  very first suggestion isn't cold. */
async function seedFromTaste(sb: SB, userId: string): Promise<CookProfile> {
  const { data } = await sb
    .from("user_preferences")
    .select("taste_profile")
    .eq("user_id", userId)
    .maybeSingle();
  const tp: any = data?.taste_profile ?? {};
  const flavor = pickFlavor(tp?.cached_profile?.all ?? tp?.scores);
  const cuisines: string[] = tp?.cached_profile?.cuisines ?? tp?.cuisines ?? [];
  const cuisineAffinity: Record<string, number> = {};
  for (const c of cuisines) cuisineAffinity[norm(c)] = 0.6;
  return { ...DEFAULT_PROFILE, flavor, cuisineAffinity };
}

export async function loadCookProfile(sb: SB, userId: string): Promise<CookProfile> {
  const { data } = await sb.from("cook_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (data) return rowToProfile(data);
  const seeded = await seedFromTaste(sb, userId);
  await sb.from("cook_profiles").upsert({ user_id: userId, ...profileToRow(seeded) });
  return seeded;
}

export async function saveCookProfile(sb: SB, userId: string, p: CookProfile): Promise<void> {
  await sb.from("cook_profiles").upsert({ user_id: userId, ...profileToRow(p) });
}

/** Candidate pool for tonight: active catalog recipes for the requested meal.
 *  Hard filters (time/dietary/allergen) are applied by the engine; we just cap
 *  the payload here. */
export async function loadCandidates(sb: SB, ctx: CookContext): Promise<EngineRecipe[]> {
  const { data } = await sb
    .from("catalog_recipes")
    .select(
      "id,title,cuisine,difficulty,total_time_minutes,meal_type,flavor,dietary_flags,primary_protein,key_ingredients,tags,avg_rating"
    )
    .eq("is_active", true)
    .eq("meal_type", ctx.mealType)
    .limit(400);
  return (data ?? []).map(catalogToEngine);
}

/** Recently cooked/suggested recipes → anti-repeat signal. */
export async function recentRecipeIds(sb: SB, userId: string, n = 15): Promise<string[]> {
  const { data } = await sb
    .from("cook_events")
    .select("recipe_id")
    .eq("user_id", userId)
    .in("action", ["cooked", "suggested"])
    .order("created_at", { ascending: false })
    .limit(n);
  return (data ?? []).map((r: any) => r.recipe_id).filter(Boolean);
}

interface LogInput {
  action: string;
  recipeId?: string | null;
  recipeSource?: "catalog" | "user";
  context?: CookContext;
  reason?: string | null;
  outcome?: Record<string, unknown>;
}

export async function logEvent(sb: SB, userId: string, e: LogInput): Promise<void> {
  await sb.from("cook_events").insert({
    user_id: userId,
    action: e.action,
    recipe_id: e.recipeId ?? null,
    recipe_source: e.recipeSource ?? null,
    context: e.context ?? {},
    reason: e.reason ?? null,
    outcome: e.outcome ?? {},
  });
}

/** The core call the loop uses: tonight's ONE suggestion (+ backup + reasoning),
 *  logged as a 'suggested' event. */
export async function getSuggestion(
  sb: SB,
  userId: string,
  ctx: CookContext,
  opts?: { log?: boolean }
): Promise<Recommendation | null> {
  const [profile, candidates, recent] = await Promise.all([
    loadCookProfile(sb, userId),
    loadCandidates(sb, ctx),
    recentRecipeIds(sb, userId),
  ]);
  const rec = recommend(candidates, { ...ctx, recentRecipeIds: recent }, profile);
  // The Home preview passes log:false — we only record a 'suggested' event when
  // the user actually runs the check-in, to keep the flywheel signal clean.
  if (rec && opts?.log !== false) {
    await logEvent(sb, userId, {
      action: "suggested",
      recipeId: rec.primary.id,
      recipeSource: "catalog",
      context: ctx,
    });
  }
  return rec;
}

/** Count DISTINCT days cooked since the start of this week (Mon). The weekly
 *  goal is a cadence — "how many days a week do you want to cook" — so two cooks
 *  on the same day count once. Powers the Home "X of Y days this week" line and
 *  the herb progression's weekly-goal milestone. */
export async function cookedThisWeek(sb: SB, userId: string): Promise<number> {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  const { data } = await sb
    .from("cook_events")
    .select("created_at")
    .eq("user_id", userId)
    .eq("action", "cooked")
    .gte("created_at", monday.toISOString());
  // Dedupe by local calendar day so multiple cooks in one day = one "cook day".
  const days = new Set<string>();
  for (const r of (data ?? []) as { created_at: string }[]) {
    const d = new Date(r.created_at);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return days.size;
}

/** Record what the user did (cooked / skipped / swapped / rated), log it, and
 *  nudge the learned profile. The reason on skip/swap is the highest-signal
 *  input in the whole app. */
export async function recordAction(
  sb: SB,
  userId: string,
  action: CookAction,
  recipe: EngineRecipe,
  ctx: CookContext,
  opts?: { reason?: string; rating?: number; source?: "catalog" | "user" }
): Promise<void> {
  await logEvent(sb, userId, {
    action,
    recipeId: recipe.id,
    recipeSource: opts?.source ?? "catalog",
    context: ctx,
    reason: opts?.reason ?? null,
    outcome: opts?.rating ? { rating: opts.rating } : {},
  });
  const profile = await loadCookProfile(sb, userId);
  const updated = learnFromEvent(profile, {
    action,
    recipe,
    reason: opts?.reason,
    rating: opts?.rating,
    context: ctx,
  });
  await saveCookProfile(sb, userId, updated);
  // NOTE (fast-follow): a nightly job recomputes catalog_recipes.cook_count /
  // avg_rating from cook_events so good recipes rise and duds sink.
}
