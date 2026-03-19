import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { plan_id } = await request.json();
    if (!plan_id) {
      return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the draft meal plan
    const { data: plan } = await admin
      .from("meal_plans")
      .select("id, user_id, recipe_id, notes")
      .eq("id", plan_id)
      .eq("user_id", user.id)
      .single();

    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (plan.recipe_id) {
      return NextResponse.json({ error: "Already saved to recipes" }, { status: 400 });
    }

    // Parse draft recipe data from notes
    let draftData: Record<string, unknown>;
    try {
      draftData = JSON.parse(plan.notes || "");
      if (!draftData.__draft__) throw new Error("Not a draft");
    } catch {
      return NextResponse.json({ error: "Invalid draft data" }, { status: 400 });
    }

    // Extract recipe fields (strip internal draft markers)
    const { __draft__: _, reasoning, ...recipeFields } = draftData as {
      __draft__: boolean;
      reasoning?: string;
      title: string;
      description: string;
      ingredients: unknown[];
      steps: string[];
      servings: number | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
      tags: string[];
    };

    // Save to recipes table
    const { data: savedRecipe, error: saveError } = await admin
      .from("recipes")
      .insert({
        user_id: user.id,
        ...recipeFields,
        notes: reasoning ? `AI-suggested: ${reasoning}` : null,
      })
      .select("id")
      .single();

    if (saveError || !savedRecipe) {
      console.error("Save draft recipe error:", saveError);
      return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 });
    }

    // Update meal plan: link to saved recipe, clear draft notes
    await admin
      .from("meal_plans")
      .update({ recipe_id: savedRecipe.id, notes: null })
      .eq("id", plan_id);

    return NextResponse.json({ success: true, recipeId: savedRecipe.id });
  } catch (error) {
    console.error("Save draft error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
