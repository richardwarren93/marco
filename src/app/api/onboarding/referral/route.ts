import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Saves the "How did you hear about us?" answer. It's the very last onboarding
// slide — asked AFTER the Taste DNA reveal has already written the full
// preferences payload — so this does a targeted read-merge-write of
// taste_profile.referral_source instead of re-posting /api/onboarding (which
// rebuilds taste_profile from its body and would wipe the saved scores).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const referralSource = typeof body.referralSource === "string" ? body.referralSource.trim() : "";
  if (!referralSource) {
    return NextResponse.json({ error: "referralSource is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: prefs } = await admin
    .from("user_preferences")
    .select("taste_profile")
    .eq("user_id", user.id)
    .single();

  const tasteProfile = { ...(prefs?.taste_profile ?? {}), referral_source: referralSource };

  const { error } = await admin.from("user_preferences").upsert(
    { user_id: user.id, taste_profile: tasteProfile, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Failed to save referral source:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
