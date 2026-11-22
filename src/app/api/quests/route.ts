import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The in-app guide's state. Completion is DATA-DRIVEN wherever possible (you
// saved a recipe, planned it, connected people…) so the guide self-advances as
// you actually use the app. Steps that are just "you answered" (cook around,
// graduation seen, "just me for now") carry a flag in
// user_preferences.taste_profile.guide.
//
// Chapter 1 "your kitchen": allergies (cook around) → taste (this-or-that) →
// recipe (save one) → plan (when are you cooking it?) → graduate.
// Chapter 2 ("your people" — bringing Marco into a group chat) was removed on
// 2026-11-22. Marco is a 1:1 assistant now; the guide ends at graduation.

// Accounts created before the two-chapter onboarding shipped are veterans:
// they never get pulled back into first-day beats (plan, graduation).
const ONBOARDING_V2_AT = Date.parse("2026-10-06T01:35:00Z"); // this deploy

// `since` = the account's guide restart point (guide.reset_at): after an
// onboarding reset, only what you do from then on counts toward the steps.
async function count(admin: ReturnType<typeof createAdminClient>, table: string, uid: string, since: string | null): Promise<number> {
  try {
    let q = admin.from(table).select("id", { head: true, count: "exact" }).eq("user_id", uid);
    if (since) q = q.gte("created_at", since);
    const r = await q;
    return r.error ? 0 : (r.count ?? 0);
  }
  catch { return 0; }
}

export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const uid = user.id;

  const prefs = await admin.from("user_preferences").select("taste_profile").eq("user_id", uid).maybeSingle();
  const tp = (prefs.data?.taste_profile as Record<string, unknown> | null) ?? {};
  const g = (tp.guide as Record<string, unknown> | undefined) ?? {};
  // An onboarding reset (guide.reset_at) replays the whole guide: nobody's a
  // veteran, and only recipes/plans/cooks/people from after it count.
  const resetAt = typeof g.reset_at === "string" && !Number.isNaN(Date.parse(g.reset_at)) ? g.reset_at : null;

  const [recipes, cooks, plans, linked] = await Promise.all([
    count(admin, "recipes", uid, resetAt),
    count(admin, "cooks", uid, resetAt),
    count(admin, "meal_plans", uid, resetAt),
    (async () => { try { const r = await admin.from("imessage_links").select("user_id", { head: true, count: "exact" }).eq("user_id", uid); return (r.count ?? 0) > 0; } catch { return false; } })(),
  ]);

  const veteran = !resetAt && Date.parse(user.created_at) < ONBOARDING_V2_AT;
  const tastePicks = Array.isArray(tp.taste_picks) ? (tp.taste_picks as unknown[]).length : 0;

  const done: Record<string, boolean> = {
    // chapter 1 — your kitchen
    allergies: g.allergies === true,
    taste: tastePicks > 0,
    recipe: recipes > 0,
    plan: plans > 0 || cooks > 0 || veteran || g.graduated === true,
    graduate: g.graduated === true || cooks > 0 || veteran,
    // informational
    cook: cooks > 0,
    linked,
    notifications: g.notifications === true,
  };
  // Which group chats Marco is in — the checkmarks persist.
  // epoch: the client scopes its per-device step skips to it, so a reset also
  // forgets skips made before it.
  return NextResponse.json({ done, uid, epoch: resetAt }, { headers: { "Cache-Control": "private, no-store" } });
}

// Mark the "you answered" steps that have no natural data signal.
const MARKS = new Set(["allergies", "household_skip", "notifications", "graduated"]);
export async function POST(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const mark = body.mark;
  if (typeof mark !== "string" || !MARKS.has(mark)) return NextResponse.json({ error: "bad mark" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error: readError } = await admin.from("user_preferences").select("taste_profile").eq("user_id", user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Could not save." }, { status: 503 }); // never overwrite on a failed read
  const tp = { ...((data?.taste_profile as Record<string, unknown> | null) ?? {}) };
  tp.guide = { ...((tp.guide as Record<string, boolean> | undefined) ?? {}), [mark]: true };
  const { error } = await admin.from("user_preferences").upsert({ user_id: user.id, taste_profile: tp, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 503 });
  return NextResponse.json({ success: true });
}
