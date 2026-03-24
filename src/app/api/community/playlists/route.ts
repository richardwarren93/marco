import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "popular";

  const admin = createAdminClient();

  const query = admin
    .from("community_playlists")
    .select("*")
    .limit(50);

  if (sort === "newest") {
    query.order("created_at", { ascending: false });
  } else {
    query.order("upvotes", { ascending: false });
  }

  const { data: playlists } = await query;

  if (!playlists || playlists.length === 0) {
    return NextResponse.json({ playlists: [], userVotes: [] });
  }

  // Get user profiles for playlist creators
  const userIds = [...new Set(playlists.map((p) => p.user_id))];
  const playlistIds = playlists.map((p) => p.id);

  const [profilesRes, votesRes] = await Promise.all([
    admin.from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", userIds),
    admin.from("community_playlist_votes").select("playlist_id").eq("user_id", user.id).in("playlist_id", playlistIds),
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
  const userVotedIds = new Set((votesRes.data || []).map((v) => v.playlist_id));

  const enriched = playlists.map((p) => ({
    ...p,
    profile: profileMap.get(p.user_id) || null,
    userVoted: userVotedIds.has(p.id),
  }));

  return NextResponse.json({ playlists: enriched });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, spotify_url, description } = await request.json();

  if (!name?.trim() || !spotify_url?.trim()) {
    return NextResponse.json({ error: "Name and Spotify URL are required" }, { status: 400 });
  }

  // Validate Spotify URL
  if (!spotify_url.includes("spotify.com") && !spotify_url.includes("spotify:")) {
    return NextResponse.json({ error: "Please provide a valid Spotify link" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("community_playlists")
    .insert({
      user_id: user.id,
      name: name.trim(),
      spotify_url: spotify_url.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ playlist: data });
}
