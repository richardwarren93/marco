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
    const { cooking_goals, weekly_cooking_goal, diet_preference, referral_source } = body;

    const admin = createAdminClient();

    // Update user_profiles with onboarding data
    const { error: profileError } = await admin
      .from("user_profiles")
      .update({
        onboarding_completed: true,
        cooking_goals: cooking_goals || [],
        diet_preference: diet_preference || "none",
        referral_source: referral_source || null,
        weekly_cooking_goal: weekly_cooking_goal || null,
      })
      .eq("user_id", user.id);

    if (profileError) throw profileError;

    // Set cookie so middleware can skip DB check for returning users
    const response = NextResponse.json({ success: true });
    response.cookies.set("marco_onboarded", "true", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save onboarding data" },
      { status: 500 }
    );
  }
}
