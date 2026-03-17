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

  // Get activity from friends (include new social columns)
  const { data: items } = await admin
    .from("activity_feed")
    .select("id, user_id, activity_type, recipe_id, metadata, image_url, caption, upvotes, downvotes, created_at")
    .in("user_id", friendIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!items || items.length === 0) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  // Get unique user_ids and recipe_ids for joining
  const userIds = [...new Set(items.map((i) => i.user_id))];
  const recipeIds = [...new Set(items.filter((i) => i.recipe_id).map((i) => i.recipe_id))];
  const activityIds = items.map((i) => i.id);

  // Also get the current user's votes on these activities
  const [profilesRes, recipesRes, votesRes] = await Promise.all([
    admin.from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", userIds),
    recipeIds.length > 0
      ? admin.from("recipes").select("id, title, image_url, tags, description").in("id", recipeIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("feed_votes")
      .select("activity_id, vote_type")
      .eq("user_id", user.id)
      .in("activity_id", activityIds),
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
  const recipeMap = new Map((recipesRes.data || []).map((r) => [r.id, r]));
  const voteMap = new Map((votesRes.data || []).map((v) => [v.activity_id, v.vote_type]));

  const enriched = items.map((item) => ({
    ...item,
    profile: profileMap.get(item.user_id) || null,
    recipe: item.recipe_id ? recipeMap.get(item.recipe_id) || null : null,
    userVote: voteMap.get(item.id) || null,
  }));

  return NextResponse.json({
    items: enriched,
    hasMore: items.length === limit,
  });
}

// POST: Update an activity entry with image_url and caption (for photo upload after cooking)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { activity_id, image_url, caption } = await request.json();
  if (!activity_id) {
    return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the activity belongs to this user
  const { data: activity } = await admin
    .from("activity_feed")
    .select("id, user_id")
    .eq("id", activity_id)
    .single();

  if (!activity || activity.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update with image and caption
  const updateData: Record<string, string | null> = {};
  if (image_url) updateData.image_url = image_url;
  if (caption !== undefined) updateData.caption = caption;

  const { error } = await admin
    .from("activity_feed")
    .update(updateData)
    .eq("id", activity_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
