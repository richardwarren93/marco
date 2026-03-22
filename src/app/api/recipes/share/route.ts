import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipe_id } = await request.json();

    const { data, error } = await supabase
      .from("recipe_shares")
      .insert({ user_id: user.id, recipe_id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ share: data });
  } catch (error) {
    console.error("Share error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to share" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipe_id } = await request.json();

    const { error } = await supabase
      .from("recipe_shares")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", recipe_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unshare error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unshare" },
      { status: 500 }
    );
  }
}
