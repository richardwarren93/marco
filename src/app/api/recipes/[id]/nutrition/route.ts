import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateNutrition } from "@/lib/claude";
import type { Ingredient } from "@/types";

export async function GET(
  _request: NextRequest,
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

  try {
    const admin = createAdminClient();
    const { data: nutrition } = await admin
      .from("recipe_nutrition")
      .select("*")
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ nutrition: nutrition || null });
  } catch {
    return NextResponse.json({ nutrition: null });
  }
}

export async function POST(
  _request: NextRequest,
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

  try {
    const admin = createAdminClient();

    // Fetch the recipe
    const { data: recipe, error: recipeError } = await admin
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const ingredients = recipe.ingredients as Ingredient[];
    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Recipe has no ingredients to estimate" },
        { status: 400 }
      );
    }

    // Call Claude to estimate nutrition
    const estimate = await estimateNutrition(
      recipe.title,
      ingredients,
      recipe.servings
    );

    // Upsert into recipe_nutrition
    const { data: nutrition, error: upsertError } = await admin
      .from("recipe_nutrition")
      .upsert(
        {
          recipe_id: recipeId,
          user_id: user.id,
          calories: estimate.calories,
          protein_g: estimate.protein_g,
          carbs_g: estimate.carbs_g,
          fat_g: estimate.fat_g,
          fiber_g: estimate.fiber_g,
          sugar_g: estimate.sugar_g,
          sodium_mg: estimate.sodium_mg,
          confidence: estimate.confidence,
          notes: estimate.notes,
          estimated_at: new Date().toISOString(),
          model_version: "claude-sonnet-4-20250514",
        },
        { onConflict: "recipe_id,user_id" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert nutrition error:", upsertError);
      throw new Error(upsertError.message);
    }

    return NextResponse.json({ nutrition });
  } catch (error) {
    console.error("Estimate nutrition error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to estimate nutrition" },
      { status: 500 }
    );
  }
}
