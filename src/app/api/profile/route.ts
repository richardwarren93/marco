import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateFriendCode } from "@/lib/friendCode";

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

    // Check if profile exists
    const { data: existing } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ profile: existing }, {
        headers: { "Cache-Control": "private, max-age=60" },
      });
    }

    // Create profile with friend code (retry on collision)
    const displayName =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Marco User";

    let attempts = 0;
    while (attempts < 5) {
      const friendCode = generateFriendCode();
      const { data: created, error } = await admin
        .from("user_profiles")
        .insert({
          user_id: user.id,
          display_name: displayName,
          friend_code: friendCode,
        })
        .select()
        .single();

      if (created) {
        return NextResponse.json({ profile: created });
      }

      // If unique constraint violation on friend_code, retry
      if (error?.code === "23505" && error.message.includes("friend_code")) {
        attempts++;
        continue;
      }

      throw error;
    }

    throw new Error("Failed to generate unique friend code");
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load profile",
      },
      { status: 500 }
    );
  }
}

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
    const admin = createAdminClient();

    const updates: Record<string, string> = {};
    if (body.display_name !== undefined)
      updates.display_name = body.display_name;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("user_profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update profile",
      },
      { status: 500 }
    );
  }
}
