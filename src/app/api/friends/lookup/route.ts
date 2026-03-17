import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeFriendCode, isValidFriendCode } from "@/lib/friendCode";

// This route does NOT require auth — used by the public /add/[code] page
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCode = searchParams.get("code") || "";
  const code = normalizeFriendCode(rawCode);

  if (!isValidFriendCode(code)) {
    return NextResponse.json(
      { error: "Invalid friend code" },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("user_profiles")
      .select("display_name, avatar_url, friend_code")
      .eq("friend_code", code)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "No user found with that code" },
        { status: 404 }
      );
    }

    // Only return public-safe info
    return NextResponse.json({
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      friend_code: profile.friend_code,
    });
  } catch (error) {
    console.error("Friend lookup error:", error);
    return NextResponse.json(
      { error: "Failed to look up user" },
      { status: 500 }
    );
  }
}
