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
    const { following_id } = await request.json();

    if (following_id === user.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ follow: data });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to follow" },
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
    const { following_id } = await request.json();

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", following_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unfollow" },
      { status: 500 }
    );
  }
}
