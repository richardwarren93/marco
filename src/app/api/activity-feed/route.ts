import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = parseInt(searchParams.get("limit") || "10");

  // Get friend IDs
  const { data: friendships } = await admin
    .from("friendships")
    .select("user_id, friend_id")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq("status", "accepted");

  const friendIds = (friendships || []).map((f) =>
    f.user_id === user.id ? f.friend_id : f.user_id
  );

  if (friendIds.length === 0) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  // Get activity from friends
  const { data: items } = await admin
    .from("activity_feed")
    .select("*")
    .in("user_id", friendIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!items || items.length === 0) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  // Get unique user_ids and recipe_ids for joining
  const userIds = [...new Set(items.map((i) => i.user_id))];
  const recipeIds = [...new Set(items.filter((i) => i.recipe_id).map((i) => i.recipe_id))];

  const [profilesRes, recipesRes] = await Promise.all([
    admin.from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", userIds),
    recipeIds.length > 0
      ? admin.from("recipes").select("id, title, image_url").in("id", recipeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
  const recipeMap = new Map((recipesRes.data || []).map((r) => [r.id, r]));

  const enriched = items.map((item) => ({
    ...item,
    profile: profileMap.get(item.user_id) || null,
    recipe: item.recipe_id ? recipeMap.get(item.recipe_id) || null : null,
  }));

  return NextResponse.json({
    items: enriched,
    hasMore: items.length === limit,
  });
}
