import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// "Retune my taste" — the profile page re-runs the dinner ranking and posts the
// freshly computed scores + cuisines here. We merge them into taste_profile and
// DROP cached_profile so the next GET /api/taste-profile recomputes with the new
// prior instead of serving the stale two-week cache.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const s = body.scores as { sweet?: number; savory?: number; richness?: number; tangy?: number } | undefined;
  const clamp = (n: unknown) => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  };
  if (!s || typeof s !== "object") {
    return NextResponse.json({ error: "scores are required" }, { status: 400 });
  }
  const scores = { sweet: clamp(s.sweet), savory: clamp(s.savory), richness: clamp(s.richness), tangy: clamp(s.tangy) };
  const cuisines = Array.isArray(body.cuisines)
    ? body.cuisines.filter((c: unknown) => typeof c === "string").slice(0, 5)
    : [];

  const admin = createAdminClient();
  const { data: prefs } = await admin
    .from("user_preferences")
    .select("taste_profile")
    .eq("user_id", user.id)
    .single();

  const tasteProfile = { ...((prefs?.taste_profile as Record<string, unknown>) ?? {}) };
  tasteProfile.scores = scores;
  if (cuisines.length) tasteProfile.cuisines = cuisines;
  delete tasteProfile.cached_profile; // force a fresh compute on next read

  const { error } = await admin.from("user_preferences").upsert(
    { user_id: user.id, taste_profile: tasteProfile, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Failed to save retuned taste:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
