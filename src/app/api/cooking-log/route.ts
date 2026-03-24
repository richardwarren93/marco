import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWeekStart, TOMATO_REWARDS } from "@/lib/gamification";
import { getOrCreateRecentlyMadeCollection } from "@/lib/collections";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const weekStart = getWeekStart().toISOString();

  const { data: logs } = await admin
    .from("cooking_logs")
    .select("*, recipes(id, title, image_url)")
    .eq("user_id", user.id)
    .gte("cooked_at", weekStart)
    .order("cooked_at", { ascending: false });

  return NextResponse.json({
    logs: logs || [],
    count: logs?.length || 0,
    weekStart,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipe_id } = await request.json();
  if (!recipe_id) {
    return NextResponse.json({ error: "recipe_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // 1. Insert cooking log
    const { data: log, error: logError } = await admin
      .from("cooking_logs")
      .insert({ user_id: user.id, recipe_id })
      .select()
      .single();

    if (logError) throw logError;

    // 2. Award tomatoes for cooking
    await admin.from("tomato_transactions").insert({
      user_id: user.id,
      amount: TOMATO_REWARDS.COOKED_RECIPE,
      reason: "cooked_recipe",
      reference_id: log.id,
    });

    // Atomic balance increment
    await admin.rpc("increment_tomato_balance", {
      p_user_id: user.id,
      p_amount: TOMATO_REWARDS.COOKED_RECIPE,
    }).then(({ error }) => {
      // Fallback if RPC doesn't exist yet - do manual update
      if (error) {
        return admin
          .from("user_profiles")
          .update({ tomato_balance: undefined }) // will use raw SQL below
          .eq("user_id", user.id);
      }
    });

    // Fallback: manual balance update if RPC not available
    const { data: profile } = await admin
      .from("user_profiles")
      .select("tomato_balance")
      .eq("user_id", user.id)
      .single();

    const currentBalance = profile?.tomato_balance || 0;
    await admin
      .from("user_profiles")
      .update({ tomato_balance: currentBalance + TOMATO_REWARDS.COOKED_RECIPE })
      .eq("user_id", user.id);

    // 3. Insert activity feed entry and capture its ID
    const { data: activityEntry } = await admin
      .from("activity_feed")
      .insert({
        user_id: user.id,
        activity_type: "cooked_recipe",
        recipe_id,
      })
      .select("id")
      .single();

    // 4. Check weekly goal completion
    const weekStart = getWeekStart().toISOString();
    const { count: weekCount } = await admin
      .from("cooking_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("cooked_at", weekStart);

    const { data: goal } = await admin
      .from("cooking_goals")
      .select("weekly_target")
      .eq("user_id", user.id)
      .single();

    let goalJustCompleted = false;
    const newBalance = currentBalance + TOMATO_REWARDS.COOKED_RECIPE;
    let finalBalance = newBalance;

    if (goal && weekCount === goal.weekly_target) {
      // Check we haven't already awarded the bonus this week
      const { count: bonusCount } = await admin
        .from("tomato_transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("reason", "weekly_goal_complete")
        .gte("created_at", weekStart);

      if (!bonusCount || bonusCount === 0) {
        await admin.from("tomato_transactions").insert({
          user_id: user.id,
          amount: TOMATO_REWARDS.WEEKLY_GOAL_COMPLETE,
          reason: "weekly_goal_complete",
        });

        finalBalance = newBalance + TOMATO_REWARDS.WEEKLY_GOAL_COMPLETE;
        await admin
          .from("user_profiles")
          .update({ tomato_balance: finalBalance })
          .eq("user_id", user.id);

        await admin.from("activity_feed").insert({
          user_id: user.id,
          activity_type: "completed_goal",
          metadata: { weekly_target: goal.weekly_target },
        });

        goalJustCompleted = true;
      }
    }

    // 5. Add to "Recently Made" collection
    try {
      const recentlyMadeId = await getOrCreateRecentlyMadeCollection(admin, user.id);
      await admin
        .from("collection_recipes")
        .upsert(
          {
            collection_id: recentlyMadeId,
            recipe_id,
            added_at: new Date().toISOString(),
          },
          { onConflict: "collection_id,recipe_id" }
        );
    } catch (recentlyMadeError) {
      console.error("Failed to add to Recently Made:", recentlyMadeError);
      // Non-blocking: don't fail the cooking log
    }

    return NextResponse.json({
      log,
      activityId: activityEntry?.id || null,
      tomatoesEarned: TOMATO_REWARDS.COOKED_RECIPE + (goalJustCompleted ? TOMATO_REWARDS.WEEKLY_GOAL_COMPLETE : 0),
      goalJustCompleted,
      weekProgress: weekCount || 0,
      weeklyTarget: goal?.weekly_target || null,
      tomatoBalance: finalBalance,
    });
  } catch (error) {
    console.error("Cooking log error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log" },
      { status: 500 }
    );
  }
}
