import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOMATO_REWARDS, TOMATO_DAILY_CAPS } from "@/lib/gamification";
import { awardTomatoes } from "@/lib/tomatoes";

// Add one recipe to one or more days/slots of the meal plan, and award tomatoes.
// This moved server-side (from a direct client insert) so the award can't be farmed
// by calling the DB directly. One award per add call (scheduling a recipe across
// several days = a single award), subject to the daily cap.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipe_id, dates, meal_type, servings } = await request.json();

    if (!recipe_id || !Array.isArray(dates) || dates.length === 0 || !meal_type) {
      return NextResponse.json(
        { error: "recipe_id, dates[] and meal_type are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const rows = dates.map((planned_date: string) => ({
      user_id: user.id,
      recipe_id,
      planned_date,
      meal_type,
      ...(servings ? { servings } : {}),
    }));

    const { data: inserted, error: insertError } = await admin
      .from("meal_plans")
      .insert(rows)
      .select("id");

    if (insertError) throw insertError;

    // Reward planning a meal. Cap-only (volume-friendly), referenced to the first
    // inserted row for traceability.
    const award = await awardTomatoes({
      userId: user.id,
      amount: TOMATO_REWARDS.ADDED_TO_MEAL_PLAN,
      reason: "added_to_meal_plan",
      referenceId: inserted?.[0]?.id ?? null,
      dailyCap: TOMATO_DAILY_CAPS.added_to_meal_plan,
    });

    return NextResponse.json({
      success: true,
      inserted: inserted ?? [],
      tomatoesEarned: award.amount,
      awarded: award.awarded,
      tomatoBalance: award.newBalance,
    });
  } catch (error) {
    console.error("Add meal plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add" },
      { status: 500 }
    );
  }
}
