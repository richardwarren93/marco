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
