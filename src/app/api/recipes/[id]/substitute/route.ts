import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestSubstitutions } from "@/lib/claude";
import type { Recipe } from "@/types";

/**
 * POST /api/recipes/[id]/substitute
 * Body: { name: string, amount: string, unit: string }
 *
 * Returns 2–3 ranked substitutes for the target ingredient, grounded in the
 * recipe's other ingredients + first few steps so the answer reflects the
 * role this ingredient is playing here. Phase 1 of the design spec — the
 * one-time-swap flavour. Standing prefs and dietary filters are Phase 2.
 *
 * No caching here yet. The recipe-nutrition route caches by (user_id,
 * recipe_id); substitutions are user-specific too, but the dimensionality
 * is bigger (per ingredient × per recipe) and we want to feel responsive
 * even on first use. Add a tiny LRU later if cost matters.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recipeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; amount?: string; unit?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "Missing ingredient name" }, { status: 400 });
  }

  // Pull the recipe via the admin client so we can read public-view recipes
  // (someone else's copy that the user is browsing) the same way the
  // detail page resolves them.
  const admin = createAdminClient();
  const { data: recipe, error } = await admin
    .from("recipes")
    .select("title, ingredients, steps")
    .eq("id", recipeId)
    .single();

  if (error || !recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const r = recipe as Pick<Recipe, "title" | "ingredients" | "steps">;

  try {
    const result = await suggestSubstitutions(
      { title: r.title, ingredients: r.ingredients ?? [], steps: r.steps ?? [] },
      { name: body.name, amount: body.amount ?? "", unit: body.unit ?? "" },
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("Substitution failed:", err);
    return NextResponse.json(
      { error: "Could not generate substitutions right now." },
      { status: 500 },
    );
  }
}
