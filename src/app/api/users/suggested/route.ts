import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/users/suggested
// Returns all app users who the current user is NOT connected to (any friendship status)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get all friendship user_ids involving the current user (any status)
  const { data: friendships } = await admin
    .from("friendships")
    .select("user_id, friend_id")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  const connectedIds = new Set<string>([user.id]);
  for (const f of friendships || []) {
    connectedIds.add(f.user_id);
    connectedIds.add(f.friend_id);
  }

  // Get ALL profiles then filter out connected ones
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, display_name, avatar_url, friend_code")
    .order("created_at", { ascending: false });

  const suggested = (profiles || []).filter((p) => !connectedIds.has(p.user_id));

  return NextResponse.json({ suggested });
}
