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

    if (!body.friendship_id) {
      return NextResponse.json(
        { error: "friendship_id is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify the user is part of this friendship
    const { data: friendship } = await admin
      .from("friendships")
      .select("*")
      .eq("id", body.friendship_id)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .single();

    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    const { error } = await admin
      .from("friendships")
      .delete()
      .eq("id", body.friendship_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove friend error:", error);
    return NextResponse.json(
      { error: "Failed to remove friend" },
      { status: 500 }
    );
  }
}
