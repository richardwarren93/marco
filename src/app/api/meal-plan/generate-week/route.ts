import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeekPlan } from "@/lib/claude";
import type { PlanSources } from "@/lib/claude";
import type { PantryItem, Recipe } from "@/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prompt, sources, weekDates } = body as {
      prompt: string;
      sources: PlanSources;
      weekDates: string[];
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!weekDates?.length) {
      return NextResponse.json({ error: "weekDates is required" }, { status: 400 });
    }

    // Fetch kitchen context based on selected sources
    let kitchenContext:
      | { pantryItems?: PantryItem[]; equipment?: string[]; recipes?: Recipe[] }
      | undefined;

    if (sources.savedRecipes || sources.pantry) {
      const [pantryRes, equipmentRes, recipesRes] = await Promise.all([
        sources.pantry
          ? supabase.from("pantry_items").select("*")
          : Promise.resolve({ data: null }),
        sources.pantry
          ? supabase.from("user_equipment").select("equipment_name").eq("user_id", user.id)
          : Promise.resolve({ data: null }),
        sources.savedRecipes
          ? supabase.from("recipes").select("id, title").order("created_at", { ascending: false }).limit(30)
          : Promise.resolve({ data: null }),
      ]);

      kitchenContext = {
        pantryItems: sources.pantry ? ((pantryRes.data as PantryItem[]) || []) : [],
        equipment: sources.pantry ? (equipmentRes.data?.map((e) => e.equipment_name) || []) : [],
        recipes: sources.savedRecipes ? ((recipesRes.data as Recipe[]) || []) : [],
      };
    }

    const entries = await generateWeekPlan(prompt, weekDates, sources, kitchenContext);

    if (!entries.length) {
      return NextResponse.json({ error: "Could not generate meal plan" }, { status: 500 });
    }

    const admin = createAdminClient();
    const insertedPlanIds: string[] = [];
    let savedCount = 0;
    let newCount = 0;

    for (const entry of entries) {
      if (entry.source_type === "saved" && entry.saved_recipe_id) {
        // Verify this recipe exists and belongs to the user
        const { data: existingRecipe } = await admin
          .from("recipes")
          .select("id")
          .eq("id", entry.saved_recipe_id)
          .eq("user_id", user.id)
          .single();

        if (existingRecipe) {
          const { data: plan, error: planError } = await admin
            .from("meal_plans")
            .insert({
              user_id: user.id,
              recipe_id: entry.saved_recipe_id,
              planned_date: entry.date,
              meal_type: entry.meal_type,
            })
            .select("id")
            .single();

          if (!planError && plan) {
            insertedPlanIds.push(plan.id);
            savedCount++;
            continue;
          }
        }
      }

      // New recipe — store as a draft in meal_plans.notes (NOT saved to recipes table)
      const draftData = {
        __draft__: true,
        ...entry.recipe,
        reasoning: entry.reasoning,
      };

      const { data: plan, error: planError } = await admin
        .from("meal_plans")
        .insert({
          user_id: user.id,
          recipe_id: null,
          planned_date: entry.date,
          meal_type: entry.meal_type,
          notes: JSON.stringify(draftData),
        })
        .select("id")
        .single();

      if (!planError && plan) {
        insertedPlanIds.push(plan.id);
        newCount++;
      }
    }

    return NextResponse.json({
      planIds: insertedPlanIds,
      stats: { savedCount, newCount },
    });
  } catch (error) {
    console.error("Generate week plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
