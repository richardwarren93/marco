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
    const { collection_id, friend_user_id, permission = "read" } = body;

    if (!collection_id || !friend_user_id) {
      return NextResponse.json(
        { error: "collection_id and friend_user_id are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify ownership
    const { data: collection } = await admin
      .from("collections")
      .select("id")
      .eq("id", collection_id)
      .eq("user_id", user.id)
      .single();

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Verify friendship
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
      .from("collection_shares")
      .upsert(
        {
          collection_id,
          shared_with_user_id: friend_user_id,
          permission,
        },
        { onConflict: "collection_id,shared_with_user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ share });
  } catch (error) {
    console.error("Share collection with friend error:", error);
    return NextResponse.json(
      { error: "Failed to share collection" },
      { status: 500 }
    );
  }
}
