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
    const body = await request.json();

    // Handle delete action
    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "Note id is required" }, { status: 400 });
      }

      const { error } = await supabase
        .from("community_notes")
        .delete()
        .eq("id", body.id)
        .eq("user_id", user.id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Handle create
    if (!body.source_url || !body.content) {
      return NextResponse.json(
        { error: "source_url and content are required" },
        { status: 400 }
      );
    }

    const { error, data } = await supabase
      .from("community_notes")
      .insert({
        user_id: user.id,
        source_url: body.source_url,
        content: body.content,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (error) {
    console.error("Community note error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save note" },
      { status: 500 }
    );
  }
}
