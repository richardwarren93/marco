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
    const body = await request.json();
    const admin = createAdminClient();

    // Upsert user_preferences
    const { error: prefError } = await admin.from("user_preferences").upsert(
      {
        user_id: user.id,
        kitchen_pal: body.kitchenPal || null,
        motivation: body.motivation || null,
        meal_planning_priority: body.priority || null,
        meals_per_week: body.mealsPerWeek || null,
        household_size: body.householdSize || 1,
        household_type: body.householdType || null,
        allergies: body.allergies || [],
        taste_profile: {
          ...(body.tasteProfile || {}),
          ...(body.tasteScores ? { scores: body.tasteScores } : {}),
          ...(body.cuisinePreferences ? { cuisines: body.cuisinePreferences } : {}),
        },
        liked_recipe_ids: body.likedRecipes || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (prefError) {
      console.error("Failed to save preferences:", prefError);
    }

    // Mark onboarding as completed on user_profiles
    const { error: profileError } = await admin
      .from("user_profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Failed to update onboarding status:", profileError);
    }

    // Set cookie for fast middleware check
    const response = NextResponse.json({ success: true });
    response.cookies.set("marco_onboarded", "1", {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
