import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWeekStart, TOMATO_REWARDS, TOMATO_DAILY_CAPS } from "@/lib/gamification";
import { awardTomatoes, getMascotHealth } from "@/lib/tomatoes";

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

  const { recipe_id, meal_plan_id } = await request.json();
  if (!recipe_id) {
    return NextResponse.json({ error: "recipe_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const today = new Date().toISOString().slice(0, 10); // UTC day

    // 0. Confirm the cook — idempotent per (user, recipe, day). The unique constraint
    //    makes re-confirming the same recipe today (from any slot) a no-op, so tomatoes
    //    can't be farmed by adding one recipe to multiple meal-plan slots.
    let newlyConfirmed = true;
    const { data: confirmRows, error: confirmErr } = await admin
      .from("cooked_confirmations")
      .upsert(
        { user_id: user.id, recipe_id, cooked_date: today, ...(meal_plan_id ? { meal_plan_id } : {}) },
        { onConflict: "user_id,recipe_id,cooked_date", ignoreDuplicates: true },
      )
      .select("id");
    if (confirmErr) {
      // Table not migrated yet (or transient) — don't block cooking; treat as fresh.
      newlyConfirmed = true;
    } else {
      newlyConfirmed = !!(confirmRows && confirmRows.length > 0);
    }

    if (!newlyConfirmed) {
      // Already confirmed this recipe today: no new log, no re-award.
      const { data: profile } = await admin
        .from("user_profiles")
        .select("tomato_balance")
        .eq("user_id", user.id)
        .single();
      return NextResponse.json({
        alreadyConfirmed: true,
        awarded: false,
        tomatoesEarned: 0,
        goalJustCompleted: false,
        tomatoBalance: profile?.tomato_balance ?? 0,
      });
    }

    // 1. Insert cooking log (linked to the planned slot when confirming from the meal plan)
    const { data: log, error: logError } = await admin
      .from("cooking_logs")
      .insert({ user_id: user.id, recipe_id, ...(meal_plan_id ? { meal_plan_id } : {}) })
      .select()
      .single();

    if (logError) throw logError;

    // 2. Award tomatoes — once per recipe per day (gated by the confirmation above),
    //    still subject to the daily cap.
    const cookAward = await awardTomatoes({
      userId: user.id,
      amount: TOMATO_REWARDS.COOKED_RECIPE,
      reason: "cooked_recipe",
      referenceId: log.id,
      dailyCap: TOMATO_DAILY_CAPS.cooked_recipe,
    });

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
    let finalBalance = cookAward.newBalance;
    let bonusEarned = 0;

    if (goal && weekCount === goal.weekly_target) {
      // Check we haven't already awarded the bonus this week
      const { count: bonusCount } = await admin
        .from("tomato_transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("reason", "weekly_goal_complete")
        .gte("created_at", weekStart);

      if (!bonusCount || bonusCount === 0) {
        const bonusAward = await awardTomatoes({
          userId: user.id,
          amount: TOMATO_REWARDS.WEEKLY_GOAL_COMPLETE,
          reason: "weekly_goal_complete",
        });

        if (bonusAward.awarded) {
          finalBalance = bonusAward.newBalance;
          bonusEarned = TOMATO_REWARDS.WEEKLY_GOAL_COMPLETE;

          await admin.from("activity_feed").insert({
            user_id: user.id,
            activity_type: "completed_goal",
            metadata: { weekly_target: goal.weekly_target },
          });

          goalJustCompleted = true;
        }
      }
    }

    // 5. Auto-manage "Recently Made" collection (max 12 recipes, most recent first)
    try {
      // Find or create the "Recently Made" collection
      let { data: recentCollection } = await admin
        .from("collections")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", "Recently Made")
        .single();

      if (!recentCollection) {
        const { data: created } = await admin
          .from("collections")
          .insert({
            user_id: user.id,
            name: "Recently Made",
            description: "Recipes you've cooked recently",
            is_public: false,
          })
          .select("id")
          .single();
        recentCollection = created;
      }

      if (recentCollection) {
        // Remove the recipe if it already exists (so we can re-add with fresh timestamp)
        await admin
          .from("collection_recipes")
          .delete()
          .eq("collection_id", recentCollection.id)
          .eq("recipe_id", recipe_id);

        // Add recipe with current timestamp
        await admin.from("collection_recipes").insert({
          collection_id: recentCollection.id,
          recipe_id,
        });

        // Enforce 12-recipe cap: remove oldest entries beyond 12
        const { data: allEntries } = await admin
          .from("collection_recipes")
          .select("id, added_at")
          .eq("collection_id", recentCollection.id)
          .order("added_at", { ascending: false });

        if (allEntries && allEntries.length > 12) {
          const toRemove = allEntries.slice(12).map((e) => e.id);
          await admin
            .from("collection_recipes")
            .delete()
            .in("id", toRemove);
        }
      }
    } catch {
      // Non-critical — don't fail the cooking log
    }

    // Mascot health AFTER the award so today's earn counts toward the streak —
    // feeds the cook celebration (streak milestones) client-side.
    const mascot = await getMascotHealth(admin, user.id);

    return NextResponse.json({
      log,
      cookingLogId: log.id,
      activityId: activityEntry?.id || null,
      tomatoesEarned: cookAward.amount + bonusEarned,
      awarded: cookAward.awarded || bonusEarned > 0,
      goalJustCompleted,
      weekProgress: weekCount || 0,
      weeklyTarget: goal?.weekly_target || null,
      tomatoBalance: finalBalance,
      streak: mascot.streak,
      mascotState: mascot.state,
    });
  } catch (error) {
    console.error("Cooking log error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log" },
      { status: 500 }
    );
  }
}
