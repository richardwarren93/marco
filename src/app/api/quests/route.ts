import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { peopleCount } from "@/lib/people";

// The in-app guide's state. Completion is DATA-DRIVEN wherever possible (you
// saved a recipe, planned it, connected people…) so the guide self-advances as
// you actually use the app. Steps that are just "you answered" (cook around,
// graduation seen, "just me for now") carry a flag in
// user_preferences.taste_profile.guide.
//
// Chapter 1 "your kitchen": allergies (cook around) → taste (this-or-that) →
// recipe (save one) → plan (when are you cooking it?) → graduate.
// Chapter 2 "your people": people (start a chat with Marco).

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

// Is Marco actually in each group chat RIGHT NOW? Read from the live bindings
// (made only when Marco receives a chat's invite in a group), so a housemate —
// or a cousin seated at the family table — sees the chat their people started,
// and a chat that's been unbound or left stops showing ✓.
type Groups = { household: boolean; family: boolean; friends: boolean };
async function chatGroups(admin: ReturnType<typeof createAdminClient>, uid: string, g: Record<string, unknown>): Promise<Groups> {
  const out: Groups = { household: false, family: false, friends: false };
  try {
    {
      const hm = await admin.from("household_members").select("household_id").eq("user_id", uid).maybeSingle();
      if (hm.data?.household_id) {
        // Only invite-made bindings count (bound_by set); legacy auto-binds don't.
        const r = await admin.from("household_groups").select("group_hash", { head: true, count: "exact" }).eq("household_id", hm.data.household_id).not("bound_by", "is", null);
        out.household = !r.error && (r.count ?? 0) > 0;
      }
    }
    {
      const seats = await admin.from("crew_members").select("crew_id").eq("user_id", uid);
      const ids = (seats.data ?? []).map((s) => s.crew_id as string);
      if (ids.length) {
        const [crews, chats] = await Promise.all([
          admin.from("crews").select("id,name").in("id", ids),
          admin.from("crew_groups").select("crew_id").in("crew_id", ids),
        ]);
        const withChat = new Set(chats.error ? [] : (chats.data ?? []).map((c) => c.crew_id as string));
        for (const c of (crews.data ?? []) as { id: string; name: string }[]) {
          if (!withChat.has(c.id)) continue;
          if (c.id === g.table_family || c.name === "Family table") out.family = true;
          if (c.id === g.table_friends || c.name === "Friends table") out.friends = true;
        }
      }
    }
  } catch { /* the flags alone still stand */ }
  return out;
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

  const [recipes, cooks, plans, people, linked] = await Promise.all([
    count(admin, "recipes", uid, resetAt),
    count(admin, "cooks", uid, resetAt),
    count(admin, "meal_plans", uid, resetAt),
    peopleCount(admin, uid),
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
    // chapter 2 — your people. Starting a group chat ticks that group (below);
    // the step itself finishes on "Done for now", "Just me", or real people.
    people: (!resetAt && people > 0) || g.people_done === true || g.people_solo === true || g.people_skip === true || g.household_skip === true || (veteran && (linked || g.people_started === true)),
    // informational
    cook: cooks > 0,
    linked,
    notifications: g.notifications === true,
  };
  // Which group chats Marco is in — the checkmarks persist.
  const groups = await chatGroups(admin, uid, g);
  // epoch: the client scopes its per-device step skips to it, so a reset also
  // forgets skips made before it.
  return NextResponse.json({ done, groups, peopleCount: people, uid, epoch: resetAt }, { headers: { "Cache-Control": "private, no-store" } });
}

// Mark the "you answered" steps that have no natural data signal.
const MARKS = new Set(["allergies", "household_skip", "notifications", "graduated", "people_started", "people_skip", "people_solo", "people_done"]);
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
