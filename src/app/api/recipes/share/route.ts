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
    const { recipe_id, friend_user_id, message } = body;

    if (!recipe_id || !friend_user_id) {
      return NextResponse.json(
        { error: "recipe_id and friend_user_id are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify the recipe belongs to the current user
    const { data: recipe } = await admin
      .from("recipes")
      .select("id, title")
      .eq("id", recipe_id)
      .eq("user_id", user.id)
      .single();

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Verify they are friends
    const { data: friendship } = await admin
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friend_user_id}),and(user_id.eq.${friend_user_id},friend_id.eq.${user.id})`
      )
      .limit(1)
      .single();

    if (!friendship) {
      return NextResponse.json(
        { error: "You can only share with friends" },
        { status: 403 }
      );
    }

    const { data: share, error } = await admin
      .from("recipe_shares")
      .upsert(
        {
          recipe_id,
          shared_by_user_id: user.id,
          shared_with_user_id: friend_user_id,
          message: message || null,
          seen: false,
        },
        { onConflict: "recipe_id,shared_by_user_id,shared_with_user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    // Notify the recipient about the shared recipe
    const { data: senderProfile } = await admin
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    try {
      await admin.from("notifications").insert({
        user_id: friend_user_id,
        type: "recipe_shared",
        actor_id: user.id,
        actor_name: senderProfile?.display_name ?? null,
        actor_avatar: senderProfile?.avatar_url ?? null,
        reference_id: share.id,
        recipe_title: recipe.title,
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ share });
  } catch (error) {
    console.error("Share recipe error:", error);
    return NextResponse.json(
      { error: "Failed to share recipe" },
      { status: 500 }
    );
  }
}
