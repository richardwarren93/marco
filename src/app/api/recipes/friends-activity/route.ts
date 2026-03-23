import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // 1. Get friend user IDs
    const { data: friendships, error: fErr } = await admin
      .from("friendships")
      .select("user_id, friend_id")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (fErr) throw fErr;

    const friendIds = (friendships || []).map((f) =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ recipes: [], friends: [] });
    }

    // 2. Get friend profiles
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", friendIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    // 3. Get friends' recent recipes (saved by them)
    const { data: friendRecipes } = await admin
      .from("recipes")
      .select("id, user_id, title, description, tags, image_url, source_platform, prep_time_minutes, cook_time_minutes, servings, meal_type, created_at")
      .in("user_id", friendIds)
      .order("created_at", { ascending: false })
      .limit(60);

    // 4. Get friends' recent meal plans to see what they're cooking
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 14);

    const { data: friendMealPlans } = await admin
      .from("meal_plans")
      .select("recipe_id, user_id, planned_date, meal_type")
      .in("user_id", friendIds)
      .gte("planned_date", thirtyDaysAgo.toISOString().split("T")[0])
      .lte("planned_date", thirtyDaysFromNow.toISOString().split("T")[0])
      .order("planned_date", { ascending: false })
      .limit(100);

    // 5. Get recipe details for meal plan recipes not already in friendRecipes
    const friendRecipeIds = new Set((friendRecipes || []).map((r) => r.id));
    const mealPlanRecipeIds = [
      ...new Set(
        (friendMealPlans || [])
          .filter((mp) => mp.recipe_id && !friendRecipeIds.has(mp.recipe_id))
          .map((mp) => mp.recipe_id)
      ),
    ];

    let mealPlanRecipes: typeof friendRecipes = [];
    if (mealPlanRecipeIds.length > 0) {
      const { data } = await admin
        .from("recipes")
        .select("id, user_id, title, description, tags, image_url, source_platform, prep_time_minutes, cook_time_minutes, servings, meal_type, created_at")
        .in("id", mealPlanRecipeIds);
      mealPlanRecipes = data || [];
    }

    // 6. Build activity context: who's cooking what
    const mealPlanActivity = new Map<string, { userId: string; plannedDate: string }[]>();
    for (const mp of friendMealPlans || []) {
      if (!mp.recipe_id) continue;
      const existing = mealPlanActivity.get(mp.recipe_id) || [];
      existing.push({ userId: mp.user_id, plannedDate: mp.planned_date });
      mealPlanActivity.set(mp.recipe_id, existing);
    }

    // 7. Combine and deduplicate recipes
    const allRecipes = [...(friendRecipes || []), ...(mealPlanRecipes || [])];
    const seen = new Set<string>();
    const uniqueRecipes = allRecipes.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // 8. Enrich with friend info and activity
    const enriched = uniqueRecipes.map((recipe) => {
      const owner = profileMap.get(recipe.user_id);
      const activity = mealPlanActivity.get(recipe.id) || [];
      const planningFriends = [...new Set(activity.map((a) => a.userId))]
        .map((uid) => profileMap.get(uid))
        .filter(Boolean);

      return {
        ...recipe,
        owner_name: owner?.display_name || "A friend",
        owner_avatar: owner?.avatar_url || null,
        owner_id: recipe.user_id,
        is_planned: activity.length > 0,
        planning_friends: planningFriends.map((p) => ({
          name: p!.display_name,
          avatar: p!.avatar_url,
        })),
        next_planned_date: activity.length > 0
          ? activity.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))[0].plannedDate
          : null,
      };
    });

    // Sort: planned recipes first, then by created_at
    enriched.sort((a, b) => {
      if (a.is_planned && !b.is_planned) return -1;
      if (!a.is_planned && b.is_planned) return 1;
      return b.created_at.localeCompare(a.created_at);
    });

    return NextResponse.json({
      recipes: enriched,
      friends: (profiles || []).map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      })),
    });
  } catch (error) {
    console.error("Friends activity error:", error);
    return NextResponse.json(
      { error: "Failed to load friends' recipes" },
      { status: 500 }
    );
  }
}
