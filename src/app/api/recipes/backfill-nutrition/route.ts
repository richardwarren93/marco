import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient } from "@/types";

const BATCH_SIZE = 10;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

async function estimateNutritionWithHaiku(
  title: string,
  ingredients: Ingredient[],
  servings: number | null
): Promise<{
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
} | null> {
  const ingredientList = ingredients
    .map((i) => `${i.amount || ""} ${i.unit || ""} ${i.name}`.trim())
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system:
        "You are a nutrition estimation assistant. Respond with valid JSON only. Estimate nutritional values per serving based on ingredients using standard USDA data.",
      messages: [
        {
          role: "user",
          content: `Estimate nutrition PER SERVING for this recipe.

Recipe: ${title}
Servings: ${servings || 1}

Ingredients:
${ingredientList}

Return JSON with: calories (number), protein_g (number), carbs_g (number), fat_g (number), fiber_g (number). All values per serving. Return ONLY valid JSON.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    return {
      calories: Math.round(parsed.calories) || 0,
      protein_g: Math.round(parsed.protein_g) || 0,
      carbs_g: Math.round(parsed.carbs_g) || 0,
      fat_g: Math.round(parsed.fat_g) || 0,
      fiber_g: Math.round(parsed.fiber_g) || 0,
    };
  } catch (err) {
    console.error(`Failed to estimate nutrition for "${title}":`, err);
    return null;
  }
}

export async function POST() {
  const admin = createAdminClient();

  // Fetch all recipes missing nutrition data
  const { data: recipes, error: fetchError } = await admin
    .from("recipes")
    .select("id, title, ingredients, servings")
    .is("calories", null)
    .order("created_at", { ascending: false });

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  // Count recipes that already have nutrition
  const { count: alreadyHadCount } = await admin
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .not("calories", "is", null);

  const total = recipes?.length || 0;
  let updated = 0;

  // Process in batches
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = recipes!.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (recipe) => {
        const nutrition = await estimateNutritionWithHaiku(
          recipe.title,
          recipe.ingredients as Ingredient[],
          recipe.servings
        );

        if (!nutrition) return false;

        const { error: updateError } = await admin
          .from("recipes")
          .update({
            calories: nutrition.calories,
            protein_g: nutrition.protein_g,
            carbs_g: nutrition.carbs_g,
            fat_g: nutrition.fat_g,
            fiber_g: nutrition.fiber_g,
          })
          .eq("id", recipe.id);

        if (updateError) {
          console.error(
            `Failed to update recipe ${recipe.id}:`,
            updateError.message
          );
          return false;
        }

        return true;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        updated++;
      }
    }
  }

  return NextResponse.json({
    total,
    updated,
    already_had_nutrition: alreadyHadCount || 0,
  });
}
