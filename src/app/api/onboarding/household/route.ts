import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Saves household size/type from the household step — now the FINALE of
// onboarding, shown AFTER the Taste DNA reveal has already written the full
// preferences payload — so it gets a targeted upsert of just these columns.
// (The household itself is created/joined by the step's own /api/household
// calls; this only records the preference fields.)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const size = Number(body.householdSize);
  const householdSize = Number.isInteger(size) && size >= 1 && size <= 10 ? size : 1;
  const householdType = typeof body.householdType === "string" && body.householdType.trim()
    ? body.householdType.trim()
    : null;

  const admin = createAdminClient();
  const { error } = await admin.from("user_preferences").upsert(
    {
      user_id: user.id,
      household_size: householdSize,
      household_type: householdType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Failed to save household prefs:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
