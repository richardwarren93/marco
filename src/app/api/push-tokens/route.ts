import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Save a push notification token for the authenticated user.
//
// Called from the client after `@capacitor/push-notifications` emits the
// 'registration' event with a device token. Idempotent: re-registering
// with the same token bumps `updated_at` instead of erroring out.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { token, platform } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  if (!["ios", "android", "web"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
