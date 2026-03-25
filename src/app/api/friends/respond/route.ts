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
    const { friendship_id, action } = body;

    if (!friendship_id || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "friendship_id and action (accept/decline) required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify the user is the recipient (friend_id) of this pending request
    const { data: friendship } = await admin
      .from("friendships")
      .select("*")
      .eq("id", friendship_id)
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .single();

    if (!friendship) {
      return NextResponse.json(
        { error: "Friend request not found" },
        { status: 404 }
      );
    }

    if (action === "decline") {
      await admin.from("friendships").delete().eq("id", friendship_id);
      return NextResponse.json({ success: true, action: "declined" });
    }

    const { data: updated, error } = await admin
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendship_id)
      .select()
      .single();

    if (error) throw error;

    // Notify the original requester that their request was accepted
    const { data: acceptorProfile } = await admin
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    try {
      await admin.from("notifications").insert({
        user_id: friendship.user_id, // the original sender
        type: "friend_accepted",
        actor_id: user.id,
        actor_name: acceptorProfile?.display_name ?? null,
        actor_avatar: acceptorProfile?.avatar_url ?? null,
        reference_id: friendship_id,
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      friendship: updated,
      action: "accepted",
    });
  } catch (error) {
    console.error("Friend respond error:", error);
    return NextResponse.json(
      { error: "Failed to respond to friend request" },
      { status: 500 }
    );
  }
}
