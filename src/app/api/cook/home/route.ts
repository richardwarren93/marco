import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSuggestion, cookedThisWeek } from "@/lib/cook-engine-db";
import type { CookContext } from "@/lib/cook-engine";

// Local YYYY-MM-DD for "today" so it matches how planned_date is stored.
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

  // Weekly streak (needed either way) + tonight's plan, in parallel.
  const [cooked, { data: planRow }] = await Promise.all([
    cookedThisWeek(supabase, user.id),
    supabase
      .from("meal_plans")
      .select(
        "recipe_id, servings, recipe:recipes(id,title,description,image_url,prep_time_minutes,cook_time_minutes,servings,ingredients,steps)"
      )
      .eq("user_id", user.id)
      .eq("planned_date", todayStr())
      .eq("meal_type", ctx.mealType)
      .not("recipe_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  // A planned meal wins.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const plan = planRow as any;
  if (plan?.recipe) {
    const r = plan.recipe;
    const total = ((r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0)) || null;
    return NextResponse.json({
      name,
      cookedThisWeek: cooked,
      weeklyGoal: 3,
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
    weeklyGoal: 3,
    planned: false,
    recipeSource: "catalog",
    reasoning,
    primary,
  });
}
