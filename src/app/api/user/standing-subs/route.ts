import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/user/standing-subs
 *   Lists the user's standing substitution preferences.
 *
 * POST /api/user/standing-subs
 *   Body: { fromName, toName, toAmount, toUnit, ratioNote?, reasoning? }
 *   Upserts a rule for the given fromName (lowercased + trimmed).
 *
 * Phase 2 of the design spec — "I never use cilantro" applied silently
 * across all recipes. Standing prefs are profile-level so they survive
 * across devices and sessions.
 */

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_standing_subs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("standing-subs list failed:", error);
    return NextResponse.json({ subs: [] });
  }
  return NextResponse.json({ subs: data ?? [] });
}

interface PostBody {
  fromName?: string;
  toName?: string;
  toAmount?: string;
  toUnit?: string;
  ratioNote?: string;
  reasoning?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.fromName?.trim() || !body.toName?.trim()) {
    return NextResponse.json({ error: "fromName and toName are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert against the (user_id, lower(trim(from_name))) unique index.
  // Supabase's upsert needs an explicit conflict target — but our key uses
  // a normalized expression, not a column. Easiest path: delete-then-insert
  // for a single user row, inside a small idempotent block.
  const fromNameNorm = body.fromName.trim();
  await admin
    .from("user_standing_subs")
    .delete()
    .eq("user_id", user.id)
    .ilike("from_name", fromNameNorm);

  const { data, error } = await admin
    .from("user_standing_subs")
    .insert({
      user_id: user.id,
      from_name: fromNameNorm,
      to_name: body.toName.trim(),
      to_amount: body.toAmount?.trim() || null,
      to_unit: body.toUnit?.trim() || null,
      ratio_note: body.ratioNote?.trim() || null,
      reasoning: body.reasoning?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error("standing-subs upsert failed:", error);
    return NextResponse.json({ error: "Could not save preference" }, { status: 500 });
  }

  return NextResponse.json({ sub: data });
}
