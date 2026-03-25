import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeFriendCode, isValidFriendCode } from "@/lib/friendCode";

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
    const code = normalizeFriendCode(body.friend_code || "");

    if (!isValidFriendCode(code)) {
      return NextResponse.json(
        { error: "Invalid friend code format" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Look up the friend code
    const { data: friendProfile } = await admin
      .from("user_profiles")
      .select("user_id, display_name")
      .eq("friend_code", code)
      .single();

    if (!friendProfile) {
      return NextResponse.json(
        { error: "No user found with that code" },
        { status: 404 }
      );
    }

    if (friendProfile.user_id === user.id) {
      return NextResponse.json(
        { error: "You can't add yourself as a friend" },
        { status: 400 }
      );
    }

    // Check if friendship already exists (in either direction)
    const { data: existing } = await admin
      .from("friendships")
      .select("id, status")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendProfile.user_id}),and(user_id.eq.${friendProfile.user_id},friend_id.eq.${user.id})`
      )
      .limit(1)
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json(
          { error: "You're already friends!" },
          { status: 400 }
        );
      }
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "Friend request already pending" },
          { status: 400 }
        );
      }
      // If declined, delete old row and allow re-request
      await admin.from("friendships").delete().eq("id", existing.id);
    }

    const { data: friendship, error } = await admin
      .from("friendships")
      .insert({
        user_id: user.id,
        friend_id: friendProfile.user_id,
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
        user_id: friendProfile.user_id,
        type: "friend_request",
        actor_id: user.id,
        actor_name: senderProfile?.display_name ?? null,
        actor_avatar: senderProfile?.avatar_url ?? null,
        reference_id: friendship.id,
      });
    } catch {
      // Non-critical — don't fail the request if notification insert fails
    }

    return NextResponse.json({
      friendship,
      friend_name: friendProfile.display_name,
    });
  } catch (error) {
    console.error("Friend request error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send friend request",
      },
      { status: 500 }
    );
  }
}
