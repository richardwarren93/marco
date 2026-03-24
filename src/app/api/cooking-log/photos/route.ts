import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get("recipe_id");
  if (!recipeId) {
    return NextResponse.json({ error: "recipe_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get friend IDs
  const { data: friendships } = await admin
    .from("friendships")
    .select("user_id, friend_id")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq("status", "accepted");

  const friendIds = (friendships || []).map((f) =>
    f.user_id === user.id ? f.friend_id : f.user_id
  );

  // Fetch all cooking logs with photos for this recipe (own + friends)
  const allowedUserIds = [user.id, ...friendIds];

  const { data: logs } = await admin
    .from("cooking_logs")
    .select("id, user_id, recipe_id, cooked_at, image_url, caption, created_at")
    .eq("recipe_id", recipeId)
    .in("user_id", allowedUserIds)
    .not("image_url", "is", null)
    .order("cooked_at", { ascending: false })
    .limit(20);

  if (!logs || logs.length === 0) {
    return NextResponse.json({ myPhotos: [], friendPhotos: [] });
  }

  // Enrich friend photos with profile info
  const friendUserIds = [...new Set(logs.filter((l) => l.user_id !== user.id).map((l) => l.user_id))];
  let profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();

  if (friendUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", friendUserIds);

    profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
  }

  const myPhotos = logs
    .filter((l) => l.user_id === user.id)
    .map((l) => ({
      id: l.id,
      image_url: l.image_url,
      caption: l.caption,
      cooked_at: l.cooked_at,
    }));

  const friendPhotos = logs
    .filter((l) => l.user_id !== user.id)
    .map((l) => ({
      id: l.id,
      image_url: l.image_url,
      caption: l.caption,
      cooked_at: l.cooked_at,
      profile: profileMap.get(l.user_id) || null,
    }));

  return NextResponse.json({ myPhotos, friendPhotos });
}

// PATCH: Add photo to an existing cooking log
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cooking_log_id, image_url, caption } = await request.json();
  if (!cooking_log_id || !image_url) {
    return NextResponse.json({ error: "cooking_log_id and image_url are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership and get recipe_id
  const { data: log } = await admin
    .from("cooking_logs")
    .select("id, user_id, recipe_id")
    .eq("id", cooking_log_id)
    .single();

  if (!log || log.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, string> = { image_url };
  if (caption) updateData.caption = caption;

  const { error } = await admin
    .from("cooking_logs")
    .update(updateData)
    .eq("id", cooking_log_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also update the most recent activity_feed entry for this cook if it exists
  await admin
    .from("activity_feed")
    .update({ image_url, caption: caption || null })
    .eq("user_id", user.id)
    .eq("activity_type", "cooked_recipe")
    .eq("recipe_id", log.recipe_id)
    .is("image_url", null);

  return NextResponse.json({ success: true });
}
