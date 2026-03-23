import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeMealPlan, estimateNutrition } from "@/lib/claude";
import type { Ingredient, MealPlanInsights } from "@/types";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { weekStart } = await request.json();
    if (!weekStart) {
      return NextResponse.json({ error: "weekStart required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Calculate week range
    const startDate = new Date(weekStart + "T12:00:00");
    const dates: string[] = [];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    const endDate = dates[6];

    // Fetch meal plans for the week (user's own + household)
    const { data: ownPlans } = await admin
      .from("meal_plans")
      .select("*, recipe:recipes(*)")
      .eq("user_id", user.id)
      .gte("planned_date", weekStart)
      .lte("planned_date", endDate);

    // Also check household
    const { data: myMembership } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single();

    let householdPlans: typeof ownPlans = [];
    if (myMembership) {
      const { data: members } = await admin
        .from("household_members")
        .select("user_id")
        .eq("household_id", myMembership.household_id)
        .neq("user_id", user.id);

      if (members && members.length > 0) {
        const memberIds = members.map((m) => m.user_id);
        const { data: hhPlans } = await admin
          .from("meal_plans")
          .select("*, recipe:recipes(*)")
          .in("user_id", memberIds)
          .gte("planned_date", weekStart)
          .lte("planned_date", endDate);
        householdPlans = hhPlans || [];
      }
    }

    const allPlans = [...(ownPlans || []), ...(householdPlans || [])];

    if (allPlans.length === 0) {
      return NextResponse.json({
        error: "No meals planned for this week. Add some meals first!",
      }, { status: 400 });
    }

    // Build hash for caching
    const planHash = crypto
      .createHash("md5")
      .update(
        allPlans
          .map((p) => `${p.recipe_id}:${p.planned_date}:${p.meal_type}:${p.servings || 1}`)
          .sort()
          .join("|")
      )
      .digest("hex");

    // Check cache
    const { data: cached } = await admin
      .from("meal_plan_insights")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single();

    if (cached && cached.meal_plan_hash === planHash) {
      return NextResponse.json({
        insights: cached.insights as MealPlanInsights,
        cached: true,
      });
    }

    // Fetch/estimate nutrition for each unique recipe
    const uniqueRecipeIds = [...new Set(allPlans.filter((p) => p.recipe_id).map((p) => p.recipe_id))];
    const nutritionMap: Record<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number } | null> = {};

    // Fetch existing nutrition
    const { data: existingNutrition } = await admin
      .from("recipe_nutrition")
      .select("*")
      .in("recipe_id", uniqueRecipeIds);

    for (const n of existingNutrition || []) {
      nutritionMap[n.recipe_id] = {
        calories: n.calories || 0,
        protein_g: parseFloat(n.protein_g) || 0,
        carbs_g: parseFloat(n.carbs_g) || 0,
        fat_g: parseFloat(n.fat_g) || 0,
        fiber_g: parseFloat(n.fiber_g) || 0,
      };
    }

    // Estimate missing ones (in parallel, max 5 concurrent)
    const missingIds = uniqueRecipeIds.filter((id) => !nutritionMap[id]);
    if (missingIds.length > 0) {
      const recipeMap: Record<string, typeof allPlans[0]["recipe"]> = {};
      for (const p of allPlans) {
        if (p.recipe && p.recipe_id) recipeMap[p.recipe_id] = p.recipe;
      }

      const estimatePromises = missingIds.map(async (recipeId) => {
        const recipe = recipeMap[recipeId];
        if (!recipe) return;

        try {
          const ingredients = recipe.ingredients as Ingredient[];
          if (!ingredients || ingredients.length === 0) return;

          const est = await estimateNutrition(recipe.title, ingredients, recipe.servings);

          // Save to DB
          await admin.from("recipe_nutrition").upsert(
            {
              recipe_id: recipeId,
              user_id: user.id,
              calories: est.calories,
              protein_g: est.protein_g,
              carbs_g: est.carbs_g,
              fat_g: est.fat_g,
              fiber_g: est.fiber_g,
              sugar_g: est.sugar_g,
              sodium_mg: est.sodium_mg,
              confidence: est.confidence,
              notes: est.notes,
              estimated_at: new Date().toISOString(),
              model_version: "claude-sonnet-4-20250514",
            },
            { onConflict: "recipe_id,user_id" }
          );

          nutritionMap[recipeId] = {
            calories: est.calories,
            protein_g: est.protein_g,
            carbs_g: est.carbs_g,
            fat_g: est.fat_g,
            fiber_g: est.fiber_g,
          };
        } catch (err) {
          console.error(`Failed to estimate nutrition for recipe ${recipeId}:`, err);
        }
      });

      await Promise.allSettled(estimatePromises);
    }

    // Build structured data for analysis
    const days = dates.map((date, i) => {
      const dayPlans = allPlans.filter((p) => p.planned_date === date);
      return {
        date,
        dayName: dayNames[i],
        meals: dayPlans.map((p) => ({
          mealType: p.meal_type,
          recipeName: p.recipe?.title || "Unknown",
          servings: p.servings || 1,
          nutrition: p.recipe_id ? nutritionMap[p.recipe_id] || null : null,
          tags: p.recipe?.tags || [],
        })),
      };
    });

    // Calculate daily averages
    const daysWithMeals = days.filter((d) => d.meals.length > 0);
    const numDays = Math.max(daysWithMeals.length, 1);
    const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

    for (const day of daysWithMeals) {
      for (const meal of day.meals) {
        if (meal.nutrition) {
          totals.calories += meal.nutrition.calories * meal.servings;
          totals.protein_g += meal.nutrition.protein_g * meal.servings;
          totals.carbs_g += meal.nutrition.carbs_g * meal.servings;
          totals.fat_g += meal.nutrition.fat_g * meal.servings;
          totals.fiber_g += meal.nutrition.fiber_g * meal.servings;
        }
      }
    }

    const dailyAverages = {
      calories: Math.round(totals.calories / numDays),
      protein_g: Math.round(totals.protein_g / numDays),
      carbs_g: Math.round(totals.carbs_g / numDays),
      fat_g: Math.round(totals.fat_g / numDays),
      fiber_g: Math.round(totals.fiber_g / numDays),
    };

    // Call Claude for analysis
    const insights = await analyzeMealPlan({
      weekStart,
      days,
      totalMeals: allPlans.length,
      dailyAverages,
    });

    // Cache the result
    await admin.from("meal_plan_insights").upsert(
      {
        user_id: user.id,
        week_start: weekStart,
        insights,
        meal_plan_hash: planHash,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start" }
    );

    return NextResponse.json({ insights, cached: false });
  } catch (error) {
    console.error("Analyze meal plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze meal plan" },
      { status: 500 }
    );
  }
}
