import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAction } from "@/lib/cook-engine-db";
import type { CookAction, CookContext, EngineRecipe } from "@/lib/cook-engine";

const VALID: CookAction[] = ["cooked", "skipped", "swapped", "rated"];

// POST /api/cook/action — record what the user did with a suggestion, log the
// event, and nudge the learned profile. This is the flywheel's write path.
// Body: { action, recipeId, context, reason?, rating? }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, recipeId, recipeSource, context, reason, rating } = await request.json().catch(() => ({}));
  if (!VALID.includes(action) || !recipeId) {
    return NextResponse.json({ error: "action and recipeId required" }, { status: 400 });
  }

  const source: "catalog" | "user" = recipeSource === "user" ? "user" : "catalog";
  let recipe: EngineRecipe;

  if (source === "user") {
    // A planned meal points at the user's own recipe (no cuisine/difficulty).
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const { data: row } = await supabase
      .from("recipes")
      .select("id,title,tags,prep_time_minutes,cook_time_minutes,ingredients")
      .eq("id", recipeId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "recipe not found" }, { status: 404 });
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const ings = ((row.ingredients as any[]) ?? []).map((i) => i?.name).filter(Boolean);
    recipe = {
      id: row.id,
      title: row.title,
      keyIngredients: ings,
      totalTimeMinutes: ((row.prep_time_minutes ?? 0) + (row.cook_time_minutes ?? 0)) || null,
    };
  } else {
    const { data: row } = await supabase
      .from("catalog_recipes")
      .select("id,title,cuisine,key_ingredients,difficulty,total_time_minutes,primary_protein")
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
  }

  await recordAction(supabase, user.id, action as CookAction, recipe, (context ?? {}) as CookContext, {
    reason,
    rating,
    source,
  });

  return NextResponse.json({ ok: true });
}
