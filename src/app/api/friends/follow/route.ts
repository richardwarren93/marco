import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/friends/follow
// Instantly creates an accepted friendship (one-way follow, no acceptance needed).
// Used by the "Suggested members" section in the notification sheet.
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
        { error: "You can't follow yourself" },
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
        return NextResponse.json({ already_following: true });
      }
      // Remove any pending/declined row and replace with accepted
      await admin.from("friendships").delete().eq("id", existing.id);
    }

    // Insert immediately as accepted — no approval needed
    const { error } = await admin.from("friendships").insert({
      user_id: user.id,
      friend_id: friend_user_id,
      status: "accepted",
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 500 }
    );
  }
}
