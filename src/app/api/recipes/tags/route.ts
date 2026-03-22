import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.id || !Array.isArray(body.tags)) {
      return NextResponse.json(
        { error: "Recipe id and tags array are required" },
        { status: 400 }
      );
    }

    const { error, data } = await supabase
      .from("recipes")
      .update({ tags: body.tags })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ recipe: data });
  } catch (error) {
    console.error("Update tags error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update tags" },
      { status: 500 }
    );
  }
}
