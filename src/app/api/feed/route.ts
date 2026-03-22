import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = 20;

  try {
    // Get who the user follows
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = following?.map((f) => f.following_id) || [];

    if (followingIds.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null });
    }

    // Get shared recipes from followed users
    let query = supabase
      .from("recipe_shares")
      .select("id, user_id, recipe_id, created_at, recipes(*), profiles:user_id(display_name, avatar_url)")
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) throw error;

    const hasMore = (data?.length || 0) > limit;
    const items = (data || []).slice(0, limit).map((item) => ({
      id: item.id,
      recipe: item.recipes,
      author: item.profiles,
      shared_at: item.created_at,
    }));

    return NextResponse.json({
      items,
      nextCursor: hasMore ? items[items.length - 1]?.shared_at : null,
    });
  } catch (error) {
    console.error("Feed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load feed" },
      { status: 500 }
    );
  }
}
