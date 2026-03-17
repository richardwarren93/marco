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
    const { activity_id, vote_type } = (await request.json()) as {
      activity_id: string;
      vote_type: "up" | "down";
    };

    if (!activity_id || !["up", "down"].includes(vote_type)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Upsert vote
    const { error: voteError } = await admin
      .from("feed_votes")
      .upsert(
        {
          user_id: user.id,
          activity_id,
          vote_type,
        },
        { onConflict: "user_id,activity_id" }
      );

    if (voteError) throw voteError;

    // Recalculate counts
    const { count: upCount } = await admin
      .from("feed_votes")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activity_id)
      .eq("vote_type", "up");

    const { count: downCount } = await admin
      .from("feed_votes")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activity_id)
      .eq("vote_type", "down");

    await admin
      .from("activity_feed")
      .update({
        upvotes: upCount || 0,
        downvotes: downCount || 0,
      })
      .eq("id", activity_id);

    return NextResponse.json({
      upvotes: upCount || 0,
      downvotes: downCount || 0,
      userVote: vote_type,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
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
    const { activity_id } = (await request.json()) as { activity_id: string };

    const admin = createAdminClient();

    await admin
      .from("feed_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("activity_id", activity_id);

    // Recalculate counts
    const { count: upCount } = await admin
      .from("feed_votes")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activity_id)
      .eq("vote_type", "up");

    const { count: downCount } = await admin
      .from("feed_votes")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activity_id)
      .eq("vote_type", "down");

    await admin
      .from("activity_feed")
      .update({
        upvotes: upCount || 0,
        downvotes: downCount || 0,
      })
      .eq("id", activity_id);

    return NextResponse.json({
      upvotes: upCount || 0,
      downvotes: downCount || 0,
      userVote: null,
    });
  } catch (error) {
    console.error("Vote delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
