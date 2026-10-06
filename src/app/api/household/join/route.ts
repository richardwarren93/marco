import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Join a household by its invite code (HOUSE-XXXX).
//   GET  ?code=…  → a preview for the invite page: { name, members, mine }
//   POST { invite_code } → join it
// One household per person. A household you're alone in (say, one made when
// you peeked at the Household chat) is replaced — recipes are per-person, so
// nothing is lost. A household with other people in it is never left silently.

const CODE = /^HOUSE-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
function normalize(raw: unknown): string | null {
  const up = String(raw ?? "").trim().toUpperCase();
  const code = up.startsWith("HOUSE-") ? up : `HOUSE-${up}`;
  return CODE.test(code) ? code : null;
}

async function signedIn() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  return user;
}

export async function GET(request: Request) {
  const user = await signedIn();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const code = normalize(new URL(request.url).searchParams.get("code"));
  if (!code) return NextResponse.json({ error: "Invalid invite code format" }, { status: 400 });
  const admin = createAdminClient();
  const { data: household } = await admin.from("households").select("id, name").eq("invite_code", code).maybeSingle();
  if (!household) return NextResponse.json({ error: "No household found with that code" }, { status: 404 });
  const [{ count }, { data: me }] = await Promise.all([
    admin.from("household_members").select("id", { count: "exact", head: true }).eq("household_id", household.id),
    admin.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle(),
  ]);
  return NextResponse.json({ name: household.name, members: count ?? 0, mine: me?.household_id === household.id }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await signedIn();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const inviteCode = normalize(body.invite_code);
  if (!inviteCode) return NextResponse.json({ error: "Invalid invite code format" }, { status: 400 });

  const admin = createAdminClient();
  const { data: household } = await admin.from("households").select("id, name").eq("invite_code", inviteCode).maybeSingle();
  if (!household) return NextResponse.json({ error: "No household found with that code" }, { status: 404 });

  // Already in a household?
  const mine = await admin.from("household_members").select("id, household_id").eq("user_id", user.id);
  if (mine.error) return NextResponse.json({ error: "Couldn't check your household. Please retry." }, { status: 503 });
  const existing = (mine.data ?? []).filter((m) => m.household_id !== household.id);
  if ((mine.data ?? []).some((m) => m.household_id === household.id) && !existing.length) {
    return NextResponse.json({ success: true, already: true, household: { id: household.id, name: household.name } });
  }
  for (const m of existing) {
    const { count, error: countErr } = await admin.from("household_members").select("id", { count: "exact", head: true }).eq("household_id", m.household_id);
    if (countErr) return NextResponse.json({ error: "Couldn't check your household. Please retry." }, { status: 503 });
    if (count !== 1) return NextResponse.json({ error: "You're already in a household. Leave it first to join another." }, { status: 400 });
  }

  // Join FIRST, then step out of the old one — so a failure deletes nothing,
  // and two people swapping households at the same moment just swap.
  const { error } = await admin.from("household_members").insert({ household_id: household.id, user_id: user.id, role: "member" });
  // 23505 = a second tab joined a moment ago — same outcome.
  if (error && error.code !== "23505") return NextResponse.json({ error: "Failed to join household" }, { status: 500 });
  for (const m of existing) {
    await admin.from("household_members").delete().eq("id", m.id);
    // Only an EMPTY household goes (someone may have joined it meanwhile).
    const { count } = await admin.from("household_members").select("id", { count: "exact", head: true }).eq("household_id", m.household_id);
    if (count === 0) { await admin.from("households").delete().eq("id", m.household_id); continue; }
    // Someone joined it in the meantime — hand it over, as leaving does.
    const { data: next } = await admin.from("household_members").select("id, user_id").eq("household_id", m.household_id).order("joined_at", { ascending: true }).limit(1).maybeSingle();
    if (next) {
      await admin.from("household_members").update({ role: "owner" }).eq("id", next.id);
      await admin.from("households").update({ created_by: next.user_id }).eq("id", m.household_id).eq("created_by", user.id);
    }
  }
  return NextResponse.json({ success: true, household: { id: household.id, name: household.name } });
}
