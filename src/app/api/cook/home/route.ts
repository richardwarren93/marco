import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSuggestion, cookedThisWeek } from "@/lib/cook-engine-db";
import type { CookContext } from "@/lib/cook-engine";

// Local YYYY-MM-DD for "today" so it matches how planned_date is stored.
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayStr(): string {
  return fmt(new Date());
}
// The 7 dates of the current week (Mon–Sun), local.
function weekDates(): string[] {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0 = Monday
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => fmt(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));
}

// GET /api/cook/home — everything the Home screen needs in one call:
//   { name, cookedThisWeek, weeklyGoal, planned, recipeSource, reasoning, primary }
// If the user already planned tonight's dinner, THAT wins — Marco defers to the
// plan instead of overriding it with a suggestion. Otherwise it falls back to a
// passive engine suggestion (log:false; the real 'suggested' event is only
// logged when the user runs the check-in).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase.from("user_preferences").select("allergies").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_profiles").select("dietary_filters,display_name").eq("user_id", user.id).maybeSingle(),
  ]);

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name =
    (profile as { display_name?: string } | null)?.display_name ||
    meta.full_name ||
    meta.name ||
    (user.email ? user.email.split("@")[0] : "") ||
    "";

  const ctx: CookContext = {
    timeBudget: "medium",
    energy: "medium",
    ingredientMode: "either",
    mealType: "dinner",
    dayOfWeek: new Date().getDay(),
    allergens: prefs?.allergies ?? [],
    dietary: (profile as { dietary_filters?: string[] } | null)?.dietary_filters ?? [],
  };

  // Weekly streak + tonight's plan + this week's planned dinners + the user's
  // actual weekly goal, in parallel.
  const wk = weekDates();
  const today = todayStr();
  const [cooked, { data: planRow }, { data: weekRows }, { data: goalRow }, { count: savedRecipes }] = await Promise.all([
    cookedThisWeek(supabase, user.id),
    supabase
      .from("meal_plans")
      .select(
        "recipe_id, servings, recipe:recipes(id,title,description,image_url,prep_time_minutes,cook_time_minutes,servings,ingredients,steps)"
      )
      .eq("user_id", user.id)
      .eq("planned_date", today)
      .eq("meal_type", ctx.mealType)
      .not("recipe_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meal_plans")
      .select("planned_date, recipe:recipes(title)")
      .eq("user_id", user.id)
      .in("planned_date", wk)
      .eq("meal_type", ctx.mealType)
      .not("recipe_id", "is", null)
      .order("planned_date", { ascending: true }),
    supabase.from("cooking_goals").select("weekly_target").eq("user_id", user.id).maybeSingle(),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  // The weekly goal is only real if the user has actually set one (a row exists).
  // Before that — e.g. a fresh account still in onboarding — there's no goal to
  // count against, so the Home "X of Y meals" line stays hidden.
  const hasGoal = !!goalRow;
  const weeklyGoal = (goalRow as { weekly_target?: number } | null)?.weekly_target ?? 3;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  // This week's planned dinners → compact list for the Home "This Week" card.
  const week = ((weekRows as any[]) ?? [])
    .map((r) => ({ date: r.planned_date as string, title: (r.recipe?.title as string) ?? null, isToday: r.planned_date === today }))
    .filter((x) => x.title);

  // A planned meal wins.
  const plan = planRow as any;
  if (plan?.recipe) {
    const r = plan.recipe;
    const total = ((r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0)) || null;
    return NextResponse.json({
      name,
      cookedThisWeek: cooked,
      weeklyGoal,
      hasGoal,
      savedRecipes: savedRecipes ?? 0,
      week,
      planned: true,
      recipeSource: "user",
      reasoning: "You planned this for tonight.",
      primary: {
        id: r.id,
        title: r.title,
        description: r.description ?? null,
        image_url: r.image_url ?? null,
        total_time_minutes: total,
        difficulty: null,
        cuisine: null,
        servings: plan.servings ?? r.servings ?? null,
        ingredients: r.ingredients ?? null,
        steps: r.steps ?? null,
      },
    });
  }

  // No plan → passive engine suggestion.
  const rec = await getSuggestion(supabase, user.id, ctx, { log: false });
  let primary = null;
  let reasoning = "";
  if (rec) {
    const { data: rows } = await supabase
      .from("catalog_recipes")
      .select("id,title,description,image_url,total_time_minutes,difficulty,cuisine,meal_type,servings,ingredients,steps")
      .eq("id", rec.primary.id)
      .maybeSingle();
    primary = rows ?? null;
    reasoning = rec.reasoning;
  }

  return NextResponse.json({
    name,
    cookedThisWeek: cooked,
    weeklyGoal,
    hasGoal,
    savedRecipes: savedRecipes ?? 0,
    planned: false,
    recipeSource: "catalog",
    reasoning,
    primary,
  });
}
