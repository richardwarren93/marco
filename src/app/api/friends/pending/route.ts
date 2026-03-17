import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // Get incoming pending requests (where current user is friend_id)
    const { data: incoming, error: inError } = await admin
      .from("friendships")
      .select("*")
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (inError) throw inError;

    // Get outgoing pending requests (where current user is user_id)
    const { data: outgoing, error: outError } = await admin
      .from("friendships")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (outError) throw outError;

    // Get profiles for all involved users
    const userIds = [
      ...(incoming || []).map((f) => f.user_id),
      ...(outgoing || []).map((f) => f.friend_id),
    ];

    let profiles: Record<string, unknown>[] = [];
    if (userIds.length > 0) {
      const { data } = await admin
        .from("user_profiles")
        .select("*")
        .in("user_id", userIds);
      profiles = data || [];
    }

    const profileMap = new Map(
      profiles.map((p) => [p.user_id as string, p])
    );

    return NextResponse.json({
      incoming: (incoming || []).map((f) => ({
        ...f,
        profile: profileMap.get(f.user_id) || null,
      })),
      outgoing: (outgoing || []).map((f) => ({
        ...f,
        profile: profileMap.get(f.friend_id) || null,
      })),
    });
  } catch (error) {
    console.error("Pending requests error:", error);
    return NextResponse.json(
      { error: "Failed to load pending requests" },
      { status: 500 }
    );
  }
}
