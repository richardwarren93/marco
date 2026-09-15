import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAction, cookedThisWeek } from "@/lib/cook-engine-db";
import type { CookContext, EngineRecipe } from "@/lib/cook-engine";
import { inferTechniques, type SkillState } from "@/lib/skills";
import { runProgression, normalizeKitchen } from "@/lib/progression-engine";

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/cook/complete — THE one true "a cook happened" write-path.
//
// Fired when the user taps "I made it!" (not when they enter cook mode). It:
//   1. logs the 'cooked' event + nudges the learned profile (via recordAction),
//   2. infers the techniques this recipe practiced,
//   3. runs the deterministic progression engine over the user's world state,
//   4. persists updated skills (cook_profiles.skills) + kitchen (user_profiles
//      .kitchen_state),
// and returns everything the completion screen needs to narrate what changed.
//
// Body: { recipeId, recipeSource?, context?, rating? }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipeId, recipeSource, context, rating } = await request.json().catch(() => ({}));
  if (!recipeId) return NextResponse.json({ error: "recipeId required" }, { status: 400 });

  const source: "catalog" | "user" = recipeSource === "user" ? "user" : "catalog";

  // ── Load the recipe: engine fields (for learning) + steps/tags (for skills) ──
  let recipe: EngineRecipe;
  let inferInput: { title?: string | null; steps?: string[] | null; tags?: string[] | null };

  if (source === "user") {
    const { data: row } = await supabase
      .from("recipes")
      .select("id,title,tags,steps,prep_time_minutes,cook_time_minutes,ingredients")
      .eq("id", recipeId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "recipe not found" }, { status: 404 });
    const ings = ((row.ingredients as any[]) ?? []).map((i) => i?.name).filter(Boolean);
    recipe = {
      id: row.id,
      title: row.title,
      keyIngredients: ings,
      totalTimeMinutes: ((row.prep_time_minutes ?? 0) + (row.cook_time_minutes ?? 0)) || null,
    };
    inferInput = { title: row.title, steps: row.steps as string[] | null, tags: row.tags as string[] | null };
  } else {
    const { data: row } = await supabase
      .from("catalog_recipes")
      .select("id,title,cuisine,key_ingredients,difficulty,total_time_minutes,primary_protein,steps,tags")
      .eq("id", recipeId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "recipe not found" }, { status: 404 });
    recipe = {
      id: row.id,
      title: row.title,
      cuisine: row.cuisine,
      keyIngredients: row.key_ingredients,
      difficulty: row.difficulty,
      totalTimeMinutes: row.total_time_minutes,
      primaryProtein: row.primary_protein,
    };
    inferInput = { title: row.title, steps: row.steps as string[] | null, tags: row.tags as string[] | null };
  }

  const techniques = inferTechniques(inferInput);

  // ── 1) Log the cook + learn (the flywheel's write path). This is now the
  //       canonical 'cooked' event — the loop no longer logs it on cook entry. ──
  await recordAction(supabase, user.id, "cooked", recipe, (context ?? {}) as CookContext, { rating, source });

  // ── 2) Read the world AFTER logging (so counts include this cook) ──
  const [{ data: profileRow }, { data: userProfileRow }, { data: goalRow }, weekCount, { count: totalCooksRaw }] =
    await Promise.all([
      supabase.from("cook_profiles").select("skills").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_profiles").select("kitchen_state").eq("user_id", user.id).maybeSingle(),
      supabase.from("cooking_goals").select("weekly_target").eq("user_id", user.id).maybeSingle(),
      cookedThisWeek(supabase, user.id),
      supabase.from("cook_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("action", "cooked"),
    ]);

  const priorSkills = (profileRow?.skills ?? {}) as SkillState;
  const kitchen = normalizeKitchen(userProfileRow?.kitchen_state);
  const hasGoal = !!goalRow;
  const weeklyTarget = (goalRow as { weekly_target?: number } | null)?.weekly_target ?? 3;
  const totalCooks = totalCooksRaw ?? 1;
  const cookedWeek = weekCount;

  // ── 3) Run the deterministic engine ──
  const result = runProgression({
    techniques,
    priorSkills,
    kitchen,
    totalCooks,
    cookedThisWeek: cookedWeek,
    weeklyTarget,
  });

  // ── 4) Persist skills + kitchen state ──
  await Promise.all([
    supabase.from("cook_profiles").update({ skills: result.skills }).eq("user_id", user.id),
    result.herbChanged
      ? supabase.from("user_profiles").update({ kitchen_state: result.kitchen }).eq("user_id", user.id)
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    ok: true,
    events: result.events,
    gains: result.gains,
    herbChanged: result.herbChanged,
    herbLevel: result.kitchen.zones.herb,
    goalProgress: { cookedThisWeek: cookedWeek, weeklyGoal: weeklyTarget, hasGoal },
  });
}
