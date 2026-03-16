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

    if (!body.source_url || !body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: "source_url and rating (1-5) are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error, data } = await admin
      .from("recipe_ratings")
      .upsert(
        {
          user_id: user.id,
          source_url: body.source_url,
          rating: body.rating,
        },
        { onConflict: "user_id,source_url" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ rating: data });
  } catch (error) {
    console.error("Rating error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save rating" },
      { status: 500 }
    );
  }
}
