import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // Get all accepted friendships where user is either side
    const { data: friendships, error } = await admin
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) throw error;

    // Get the other user's profile for each friendship
    const friendUserIds = (friendships || []).map((f) =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    if (friendUserIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    const { data: profiles } = await admin
      .from("user_profiles")
      .select("*")
      .in("user_id", friendUserIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    const friends = (friendships || []).map((f) => {
      const friendUserId =
        f.user_id === user.id ? f.friend_id : f.user_id;
      return {
        ...f,
        profile: profileMap.get(friendUserId) || null,
      };
    });

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Friends list error:", error);
    return NextResponse.json(
      { error: "Failed to load friends" },
      { status: 500 }
    );
  }
}
