import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * POST /api/grocery-list/seed-prices
 *
 * One-time batch job: scans all recipe ingredients in the DB,
 * finds any without cached prices, and estimates them in batches via Haiku.
 *
 * Protected: requires authenticated user (admin use only).
 */
export async function GET() {
  return POST();
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    // Step 1: Get all unique ingredient names across all recipes
    const { data: recipes } = await admin
      .from("recipes")
      .select("ingredients");

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({ message: "No recipes found", seeded: 0 });
    }

    const allIngredients = new Set<string>();
    for (const recipe of recipes) {
      const ingredients = recipe.ingredients as { name?: string }[] | null;
      if (!ingredients) continue;
      for (const ing of ingredients) {
        if (ing.name) allIngredients.add(normalize(ing.name));
      }
    }

    // Step 2: Find which ones already have cached prices
    const { data: existingPrices } = await admin
      .from("ingredient_prices")
      .select("name_normalized");

    const existingSet = new Set((existingPrices || []).map((p) => p.name_normalized));
    const uncached = [...allIngredients].filter((name) => !existingSet.has(name));

    if (uncached.length === 0) {
      return NextResponse.json({
        message: "All ingredients already have cached prices",
        total_ingredients: allIngredients.size,
        already_cached: existingSet.size,
        seeded: 0,
      });
    }

    // Step 3: Batch estimate in chunks of 30 (to stay within Haiku context)
    const BATCH_SIZE = 30;
    let totalSeeded = 0;

    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      const batch = uncached.slice(i, i + BATCH_SIZE);
      const itemList = batch.map((name) => `- ${name}`).join("\n");

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: `You are a grocery pricing expert. Estimate per-unit prices in USD for typical US grocery stores (2025 prices).
Return ONLY valid JSON:
{
  "items": [
    { "name": "ingredient name", "price_low": 1.50, "price_high": 2.50, "per_unit": "lb" }
  ]
}
price_low = budget/sale price, price_high = typical retail. Round to nearest $0.25.
Return one entry per input ingredient, in the same order.`,
          messages: [
            { role: "user", content: `Estimate per-unit prices:\n${itemList}` },
          ],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]);
        const items: { name: string; price_low: number; price_high: number; per_unit: string }[] = parsed.items || [];

        const rows = items.map((item, idx) => ({
          name: batch[idx] || item.name,
          name_normalized: batch[idx] || normalize(item.name),
          unit: item.per_unit || null,
          price_low: item.price_low,
          price_high: item.price_high,
          source: "claude",
        }));

        if (rows.length > 0) {
          await admin
            .from("ingredient_prices")
            .upsert(rows, { onConflict: "name_normalized,unit", ignoreDuplicates: true });
          totalSeeded += rows.length;
        }
      } catch (batchError) {
        console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, batchError);
        // Continue with next batch
      }
    }

    return NextResponse.json({
      message: "Price seeding complete",
      total_ingredients: allIngredients.size,
      already_cached: existingSet.size,
      newly_seeded: totalSeeded,
      remaining: uncached.length - totalSeeded,
    });
  } catch (error) {
    console.error("Seed prices error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed prices" },
      { status: 500 }
    );
  }
}
