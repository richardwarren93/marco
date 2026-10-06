import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signBind } from "@/lib/imessage/protocol";
import { getGuidePrefs, setGuidePrefs } from "@/lib/guidePrefs";
import type { Crew } from "@/lib/social";

// Start a group chat with Marco from the app. Returns the seed message for
// Messages with a signed invite link inside it. When that message lands in a
// group, the bridge finds the token (?m=…) and binds the chat:
//   household       → the household's ONE shared kitchen (created here if needed)
//   family/friends  → that chat's Table — a crew where people share what they
//                     cooked (one per group, remembered in the guide prefs)
//   table + crewId  → a Table you already sit at
// The token proves this user started the chat from the app. It carries no
// secret and expires in 3 days.

type Admin = ReturnType<typeof createAdminClient>;
type Who = { name: string | null; avatar: string | null };

const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: NO_STORE });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TABLES = {
  family: { name: "Family table", emoji: "👪", ours: "our family table" },
  friends: { name: "Friends table", emoji: "🍻", ours: "our friends' table" },
} as const;

// Same codes as /api/household (HOUSE-XXXX, no look-alike characters).
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateHouseholdCode(): string {
  const bytes = randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) code += CHARSET[bytes[i] % CHARSET.length];
  return `HOUSE-${code}`;
}

// ── Household ────────────────────────────────────────────────────────────────
// One household per person. Oldest membership first, so a stray duplicate
// can't hide the real one.
async function currentHousehold(admin: Admin, uid: string): Promise<{ id: string; invite_code: string } | null> {
  const seat = await admin.from("household_members").select("household_id").eq("user_id", uid).order("joined_at", { ascending: true }).order("id", { ascending: true }).limit(1).maybeSingle();
  if (seat.error) throw seat.error;
  if (!seat.data) return null;
  const house = await admin.from("households").select("id, invite_code").eq("id", seat.data.household_id).maybeSingle();
  if (house.error) throw house.error;
  return house.data;
}

async function ensureHousehold(admin: Admin, uid: string, who: Who) {
  const mine = await currentHousehold(admin, uid);
  if (mine) return mine;

  // Unique invite code (retry on collision), as POST /api/household does.
  let inviteCode = generateHouseholdCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const { data: collision } = await admin.from("households").select("id").eq("invite_code", inviteCode).maybeSingle();
    if (!collision) break;
    inviteCode = generateHouseholdCode();
  }
  const made = await admin.from("households").insert({ name: who.name ? `${who.name}'s household` : "My household", created_by: uid, invite_code: inviteCode }).select("id, invite_code").single();
  if (made.error || !made.data) throw made.error ?? new Error("household");
  const owner = await admin.from("household_members").insert({ household_id: made.data.id, user_id: uid, role: "owner" });
  if (owner.error) {
    await admin.from("households").delete().eq("id", made.data.id);
    throw owner.error;
  }
  // Two quick taps can both get this far. The oldest membership wins and the
  // spare household goes (its member row cascades with it).
  const winner = await currentHousehold(admin, uid);
  if (winner && winner.id !== made.data.id) {
    await admin.from("households").delete().eq("id", made.data.id);
    return winner;
  }
  return made.data;
}

// ── Tables (crews) ───────────────────────────────────────────────────────────
// A crew this person still sits at, or null.
async function seatedCrew(admin: Admin, uid: string, crewId: string): Promise<Crew | null> {
  if (!UUID.test(crewId)) return null;
  const [crew, seat] = await Promise.all([
    admin.from("crews").select("*").eq("id", crewId).maybeSingle(),
    admin.from("crew_members").select("id").eq("crew_id", crewId).eq("user_id", uid).maybeSingle(),
  ]);
  if (crew.error || seat.error) throw crew.error ?? seat.error;
  return crew.data && seat.data ? (crew.data as Crew) : null;
}

// Plain insert (crew_members has no UPDATE policy); 23505 = already seated.
async function sit(admin: Admin, crewId: string, uid: string, who: Who, role: "owner" | "member") {
  const { error } = await admin.from("crew_members").insert({ crew_id: crewId, user_id: uid, role, display_name: who.name, avatar: who.avatar });
  if (error && error.code !== "23505") throw error;
}

async function ensureTable(admin: Admin, uid: string, group: "family" | "friends", who: Who, startedAt: number): Promise<Crew> {
  const key = `table_${group}`;
  const spec = TABLES[group];

  // 1. The table this group already has (read right before any insert).
  const remembered = (await getGuidePrefs(admin, uid))[key];
  const known = typeof remembered === "string" ? await seatedCrew(admin, uid, remembered) : null;
  if (known) return known;

  // 2. A table of this name they already sit at — one a relative started (and
  //    already has a group chat), or one they started before. Prefer the one
  //    with a chat, so a second person never splits the family table.
  const seats = await admin.from("crew_members").select("crew_id").eq("user_id", uid);
  if (seats.error) throw seats.error;
  const ids = (seats.data ?? []).map((r) => r.crew_id as string);
  if (ids.length) {
    const named = await admin.from("crews").select("*").in("id", ids).eq("name", spec.name).order("created_at", { ascending: true });
    if (named.error) throw named.error;
    const list = (named.data ?? []) as Crew[];
    if (list.length) {
      const chats = await admin.from("crew_groups").select("crew_id").in("crew_id", list.map((c) => c.id));
      const withChat = new Set(chats.error ? [] : (chats.data ?? []).map((r) => r.crew_id as string));
      const found = list.find((c) => withChat.has(c.id)) ?? list.find((c) => c.created_by === uid) ?? list[0];
      await setGuidePrefs(admin, uid, { [key]: found.id });
      return found;
    }
  }

  // 3. A fresh table.
  const made = await admin.from("crews").insert({ name: spec.name, emoji: spec.emoji, created_by: uid }).select("*").single();
  if (made.error || !made.data) throw made.error ?? new Error("crew");
  let crew = made.data as Crew;
  try {
    await sit(admin, crew.id, uid, who, "owner");
  } catch (error) {
    await admin.from("crews").delete().eq("id", crew.id);
    throw error;
  }
  // Two quick taps can both get this far. Both converge on the oldest table
  // made under this name since just before THIS request began; the spare goes
  // (its seat cascades with it). Older tables are never adopted here.
  const since = new Date(startedAt - 10_000).toISOString();
  const twins = await admin.from("crews").select("*").eq("created_by", uid).eq("name", spec.name).gte("created_at", since).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1);
  const first = twins.data?.[0] as Crew | undefined;
  if (first && first.id !== crew.id) {
    await admin.from("crews").delete().eq("id", crew.id);
    await sit(admin, first.id, uid, who, "owner"); // its own request may still be seating them
    crew = first;
  }
  await setGuidePrefs(admin, uid, { [key]: crew.id });
  return crew;
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const startedAt = Date.now();
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) return json({ error: "Invalid origin." }, 403);
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return json({ error: "Sign in first." }, 401);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return json({ error: "Group chats aren't available right now." }, 503);

  let body: { group?: unknown; crewId?: unknown };
  try { body = (await request.json()) ?? {}; } catch { return json({ error: "Invalid request." }, 400); }
  const group = body.group;
  if (group !== "household" && group !== "family" && group !== "friends" && group !== "table") return json({ error: "Pick household, family, friends or a table." }, 400);
  if (group === "table" && typeof body.crewId !== "string") return json({ error: "Which table?" }, 400);

  const admin = createAdminClient();
  try {
    const profile = await admin.from("user_profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    const name = (profile.data?.display_name as string | null | undefined)?.trim() || user.email?.split("@")[0] || null;
    const first = name ? Array.from(name)[0] : undefined; // whole emoji, never half a surrogate pair
    const who: Who = { name, avatar: first ? first.toUpperCase() : null };

    if (group === "household") {
      const house = await ensureHousehold(admin, user.id, who);
      const token = signBind(serviceKey, { k: "household", id: house.id, u: user.id, g: "household" });
      const url = `${origin}/join/house/${house.invite_code}?m=${token}`;
      return json({ group, kind: "household", name: "household kitchen", url, seed: `hey Marco 🍅 this is our household kitchen — any recipe we drop here lands in our shared kitchen. join it: ${url}` });
    }

    const crew = group === "table" ? await seatedCrew(admin, user.id, body.crewId as string) : await ensureTable(admin, user.id, group, who, startedAt);
    if (!crew) return json({ error: "Table not found." }, 404);
    // Started from the table list? If it's this person's Family or Friends
    // table, the chat still ticks that row once Marco is in it.
    let g: "family" | "friends" | "table" = group;
    if (group === "table") {
      const prefs = await getGuidePrefs(admin, user.id);
      g = prefs.table_family === crew.id ? "family" : prefs.table_friends === crew.id ? "friends" : "table";
    }
    const token = signBind(serviceKey, { k: "table", id: crew.id, u: user.id, g });
    const url = `${origin}/join/${crew.invite_code}?m=${token}`;
    const ours = group === "table" ? `our table, ${crew.name}` : TABLES[group].ours;
    return json({ group, kind: "table", name: crew.name, url, seed: `hey Marco 🍅 this is ${ours} — tell Marco what you cook ("I made lasagna") and it goes on the table. pull up a chair: ${url}` });
  } catch {
    return json({ error: "Couldn't start that chat. Please retry." }, 503);
  }
}
