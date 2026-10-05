import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The ongoing in-app guide's state. Completion is DATA-DRIVEN wherever possible
// (you saved a recipe, cooked, joined a table…) so the guide self-advances as
// you actually use the app. A couple of steps that are just "you answered"
// (allergies, "just me" household) carry a flag in user_preferences.taste_profile.guide.

async function count(admin: ReturnType<typeof createAdminClient>, table: string, uid: string): Promise<number> {
  try { const r = await admin.from(table).select("id", { head: true, count: "exact" }).eq("user_id", uid); return r.error ? 0 : (r.count ?? 0); }
  catch { return 0; }
}

export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const uid = user.id;

  const [prefs, recipes, cooks, members, crews, linked, potCreated, potSubmitted] = await Promise.all([
    admin.from("user_preferences").select("taste_profile").eq("user_id", uid).maybeSingle(),
    count(admin, "recipes", uid),
    count(admin, "cooks", uid),
    count(admin, "household_members", uid),
    count(admin, "crew_members", uid),
    (async () => { try { const r = await admin.from("imessage_links").select("id", { head: true, count: "exact" }).eq("user_id", uid); return (r.count ?? 0) > 0; } catch { return false; } })(),
    (async () => { try { const r = await admin.from("potlucks").select("id", { head: true, count: "exact" }).eq("created_by", uid); return (r.count ?? 0) > 0; } catch { return false; } })(),
    (async () => { try { const r = await admin.from("potluck_submissions").select("id", { head: true, count: "exact" }).eq("user_id", uid); return (r.count ?? 0) > 0; } catch { return false; } })(),
  ]);

  const tp = (prefs.data?.taste_profile as Record<string, unknown> | null) ?? {};
  const g = (tp.guide as Record<string, boolean> | undefined) ?? {};
  const tastePicks = Array.isArray(tp.taste_picks) ? (tp.taste_picks as unknown[]).length : 0;

  const done: Record<string, boolean> = {
    allergies: g.allergies === true,
    recipe: recipes > 0,
    taste: tastePicks > 0,
    household: members > 0 || linked || g.household_skip === true,
    cook: cooks > 0,
    table: crews > 0,
    potluck: potCreated || potSubmitted,
  };
  return NextResponse.json({ done }, { headers: { "Cache-Control": "private, no-store" } });
}

// Mark the "you answered" steps that have no natural data signal.
export async function POST(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const mark = body.mark;
  if (mark !== "allergies" && mark !== "household_skip") return NextResponse.json({ error: "bad mark" }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.from("user_preferences").select("taste_profile").eq("user_id", user.id).maybeSingle();
  const tp = { ...((data?.taste_profile as Record<string, unknown> | null) ?? {}) };
  tp.guide = { ...((tp.guide as Record<string, boolean> | undefined) ?? {}), [mark]: true };
  const { error } = await admin.from("user_preferences").upsert({ user_id: user.id, taste_profile: tp, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 503 });
  return NextResponse.json({ success: true });
}
