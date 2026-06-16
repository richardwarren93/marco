import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET  /api/user/allergies  → { allergies: string[] }
 * POST /api/user/allergies  body { allergies: string[] } → { allergies: string[] }
 *
 * Profile-level food allergies — the same `user_preferences.allergies` array the
 * onboarding allergies step writes. POST replaces the array wholesale (the
 * profile card sends the full set each time). Free-text is allowed (custom
 * allergens), so we just trim / dedupe / cap rather than validate against a
 * fixed list.
 */

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_preferences")
    .select("allergies")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("allergies GET failed:", error);
    return NextResponse.json({ allergies: [] });
  }
  return NextResponse.json({ allergies: (data?.allergies as string[] | null) ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { allergies?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!Array.isArray(body.allergies)) {
    return NextResponse.json({ error: "allergies must be an array" }, { status: 400 });
  }

  const cleaned = Array.from(
    new Set(
      body.allergies
        .filter((v): v is string => typeof v === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 40),
    ),
  ).slice(0, 30);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_preferences")
    .upsert(
      { user_id: user.id, allergies: cleaned, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("allergies")
    .single();

  if (error) {
    console.error("allergies POST failed:", error);
    return NextResponse.json({ error: "Could not save allergies" }, { status: 500 });
  }
  return NextResponse.json({ allergies: (data?.allergies as string[] | null) ?? [] });
}
