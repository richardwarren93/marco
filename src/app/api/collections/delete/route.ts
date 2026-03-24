import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RECENTLY_MADE_COLLECTION_NAME } from "@/lib/collections";

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

    if (!body.id) {
      return NextResponse.json({ error: "Collection id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Guard: prevent deleting the "Recently Made" system collection
    const { data: collection } = await admin
      .from("collections")
      .select("name")
      .eq("id", body.id)
      .single();

    if (collection?.name === RECENTLY_MADE_COLLECTION_NAME) {
      return NextResponse.json(
        { error: "Cannot delete the Recently Made collection" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("collections")
      .delete()
      .eq("id", body.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete collection" },
      { status: 500 }
    );
  }
}
