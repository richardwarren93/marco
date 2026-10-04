import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The deferred taste profile. Onboarding flags `taste_profile.onboarding_pending`
// and the app fires a one-time "almost there" taste picker on the next open.
// GET reports whether it's still pending; POST records the picks and clears it.

export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ pending: false }, { status: 401 });
  const { data } = await createAdminClient().from("user_preferences").select("taste_profile").eq("user_id", user.id).maybeSingle();
  const tp = (data?.taste_profile as Record<string, unknown> | null) ?? {};
  return NextResponse.json({ pending: tp.onboarding_pending === true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const liked = Array.isArray(body.liked) ? body.liked.filter((s: unknown): s is string => typeof s === "string" && s.length <= 60).slice(0, 24) : [];
  const admin = createAdminClient();
  const { data } = await admin.from("user_preferences").select("taste_profile").eq("user_id", user.id).maybeSingle();
  const tp = { ...((data?.taste_profile as Record<string, unknown> | null) ?? {}) };
  delete tp.onboarding_pending; // clear the pending flag — taste is done (or skipped)
  if (liked.length) tp.taste_picks = liked;
  const { error } = await admin.from("user_preferences").upsert({ user_id: user.id, taste_profile: tp, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) { console.warn("[taste] save failed", error.code); return NextResponse.json({ error: "Could not save." }, { status: 500 }); }
  return NextResponse.json({ success: true });
}
