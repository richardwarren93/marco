import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/friends/follow
// Sends a pending friend request (befriend). The recipient must accept before
// the friendship is active.  Used by the "Suggested members" section in the
// notification sheet.
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
    const { friend_user_id } = body;

    if (!friend_user_id) {
      return NextResponse.json(
        { error: "friend_user_id is required" },
        { status: 400 }
      );
    }

    if (friend_user_id === user.id) {
      return NextResponse.json(
        { error: "You can't befriend yourself" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check if any friendship already exists (either direction)
    const { data: existing } = await admin
      .from("friendships")
      .select("id, status")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friend_user_id}),and(user_id.eq.${friend_user_id},friend_id.eq.${user.id})`
      )
      .limit(1)
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ already_friends: true });
      }
      if (existing.status === "pending") {
        return NextResponse.json({ already_pending: true });
      }
      // Remove any declined row and replace with a fresh pending request
      await admin.from("friendships").delete().eq("id", existing.id);
    }

    // Insert as pending — recipient must accept
    const { data: friendship, error } = await admin
      .from("friendships")
      .insert({
        user_id: user.id,
        friend_id: friend_user_id,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Get the sender's profile for the notification
    const { data: senderProfile } = await admin
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    // Notify the recipient about the friend request
    try {
      await admin.from("notifications").insert({
        user_id: friend_user_id,
        type: "friend_request",
        actor_id: user.id,
        actor_name: senderProfile?.display_name ?? null,
        actor_avatar: senderProfile?.avatar_url ?? null,
        reference_id: friendship.id,
      });
    } catch {
      // Non-critical — don't fail the request if notification insert fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Befriend error:", error);
    return NextResponse.json(
      { error: "Failed to send friend request" },
      { status: 500 }
    );
  }
}
