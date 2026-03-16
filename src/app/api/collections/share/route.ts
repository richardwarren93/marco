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

    if (!body.collection_id) {
      return NextResponse.json({ error: "collection_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch current collection to toggle is_public
    const { data: current } = await admin
      .from("collections")
      .select("is_public, share_token")
      .eq("id", body.collection_id)
      .eq("user_id", user.id)
      .single();

    if (!current) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const { error, data } = await admin
      .from("collections")
      .update({ is_public: !current.is_public })
      .eq("id", body.collection_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ collection: data });
  } catch (error) {
    console.error("Share collection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to share collection" },
      { status: 500 }
    );
  }
}
