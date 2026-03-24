import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RECENTLY_MADE_COLLECTION_NAME } from "@/lib/collections";

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

    const { data: cols, error } = await admin
      .from("collections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch recipe counts
    const withCounts = await Promise.all(
      (cols || []).map(async (col) => {
        const { count } = await admin
          .from("collection_recipes")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", col.id);
        return { ...col, recipe_count: count || 0 };
      })
    );

    // Sort "Recently Made" to the top
    withCounts.sort((a, b) => {
      if (a.name === RECENTLY_MADE_COLLECTION_NAME) return -1;
      if (b.name === RECENTLY_MADE_COLLECTION_NAME) return 1;
      return 0;
    });

    return NextResponse.json({ collections: withCounts });
  } catch (error) {
    console.error("Fetch collections error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

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
    const admin = createAdminClient();

    const { error, data } = await admin
      .from("collections")
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase collection insert error:", JSON.stringify(error));
      throw new Error(error.message || error.code || "Supabase insert failed");
    }
    return NextResponse.json({ collection: data });
  } catch (error) {
    console.error("Create collection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create collection" },
      { status: 500 }
    );
  }
}
