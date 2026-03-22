import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Get follower/following counts
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  // Get shared recipes
  const { data: sharedRecipes } = await supabase
    .from("recipe_shares")
    .select("recipe_id, created_at, recipes(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    profile,
    followerCount: followersRes.count || 0,
    followingCount: followingRes.count || 0,
    sharedRecipes: sharedRecipes?.map((s) => ({
      ...s.recipes,
      shared_at: s.created_at,
    })) || [],
  });
}
