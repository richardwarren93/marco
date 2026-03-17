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
    // Get accepted friend IDs
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted");

    const friendIds = (friendships || []).map((f) =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Get recent cooked_recipe activity from friends (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const admin = createAdminClient();
    const { data: activities } = await admin
      .from("activity_feed")
      .select("id, user_id, recipe_id, created_at")
      .in("user_id", friendIds)
      .eq("activity_type", "cooked_recipe")
      .gte("created_at", twoWeeksAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    if (!activities || activities.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Get profiles and recipes for enrichment
    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const recipeIds = [
      ...new Set(activities.map((a) => a.recipe_id).filter(Boolean)),
    ];

    const [profilesRes, recipesRes] = await Promise.all([
      admin
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", userIds),
      recipeIds.length > 0
        ? admin
            .from("recipes")
            .select(
              "id, title, description, tags, image_url, prep_time_minutes, cook_time_minutes, servings"
            )
            .in("id", recipeIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map(
      (profilesRes.data || []).map((p) => [p.user_id, p.display_name])
    );
    const recipeMap = new Map(
      (recipesRes.data || []).map((r) => [r.id, r])
    );

    const items = activities
      .filter((a) => a.recipe_id && recipeMap.has(a.recipe_id))
      .map((a) => ({
        id: a.id,
        friendName: profileMap.get(a.user_id) || "Someone",
        cookedAt: a.created_at,
        recipe: recipeMap.get(a.recipe_id)!,
      }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Friends cooking error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
