import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { playlist_id } = await request.json();
  if (!playlist_id) {
    return NextResponse.json({ error: "playlist_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if already voted
  const { data: existing } = await admin
    .from("community_playlist_votes")
    .select("id")
    .eq("user_id", user.id)
    .eq("playlist_id", playlist_id)
    .maybeSingle();

  if (existing) {
    // Remove vote (toggle off)
    await admin
      .from("community_playlist_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("playlist_id", playlist_id);
  } else {
    // Add vote
    await admin
      .from("community_playlist_votes")
      .insert({ user_id: user.id, playlist_id });
  }

  // Recount and sync
  const { count } = await admin
    .from("community_playlist_votes")
    .select("*", { count: "exact", head: true })
    .eq("playlist_id", playlist_id);

  await admin
    .from("community_playlists")
    .update({ upvotes: count || 0 })
    .eq("id", playlist_id);

  return NextResponse.json({ voted: !existing, upvotes: count || 0 });
}
