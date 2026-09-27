// Marco social spine — client-side queries against the crews/cooks/potlucks
// schema (RLS enforces who can read/write). Used by the Table feed, the + post
// flow, crews, and potlucks.

import { createClient } from "@/lib/supabase/client";

export interface Crew {
  id: string;
  name: string;
  emoji: string | null;
  invite_code: string;
  created_by: string;
}

export interface Cook {
  id: string;
  user_id: string | null;
  crew_id: string | null;
  is_featured?: boolean;
  title: string | null;
  note: string | null;
  photo_url: string | null;
  card_treatment: string;
  author_name: string | null;
  author_avatar: string | null;
  from_user: string | null;
  created_at: string;
}

// ── Identity (for denormalizing onto cooks) ──────────────────────────────────
export async function getMe() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from("user_profiles").select("display_name, avatar_url").eq("user_id", user.id).single();
  const name = (profile?.display_name as string) || user.email?.split("@")[0] || "You";
  return { id: user.id, name, avatar: name.slice(0, 1).toUpperCase() };
}

// ── Crews ────────────────────────────────────────────────────────────────────
export async function getMyCrews(): Promise<Crew[]> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data: memberships } = await sb.from("crew_members").select("crew_id").eq("user_id", user.id);
  const ids = (memberships ?? []).map((m: { crew_id: string }) => m.crew_id);
  if (ids.length === 0) return [];
  const { data: crews } = await sb.from("crews").select("*").in("id", ids).order("created_at", { ascending: true });
  return (crews ?? []) as Crew[];
}

export async function getPrimaryCrew(): Promise<Crew | null> {
  const crews = await getMyCrews();
  return crews[0] ?? null;
}

// Always returns a crew to post into — creates a default one if you have none,
// so a cook is never stranded as self-only.
export async function ensureCrew(): Promise<Crew | null> {
  const existing = await getPrimaryCrew();
  if (existing) return existing;
  return createCrew("My table");
}

export async function createCrew(name: string, emoji = "🍽️"): Promise<Crew | null> {
  const sb = createClient();
  const me = await getMe();
  if (!me) return null;
  const { data: crew, error } = await sb.from("crews").insert({ name, emoji, created_by: me.id }).select("*").single();
  if (error || !crew) return null;
  await sb.from("crew_members").insert({ crew_id: crew.id, user_id: me.id, role: "owner" });
  await denormMember(crew.id, me.id, me.name, me.avatar);
  return crew as Crew;
}

// Best-effort: stamp your name/avatar onto your crew_members row so others can
// see your seat. No-ops silently if the columns don't exist yet.
async function denormMember(crewId: string, userId: string, name: string, avatar: string) {
  const sb = createClient();
  try { await sb.from("crew_members").update({ display_name: name, avatar }).eq("crew_id", crewId).eq("user_id", userId); } catch { /* columns not migrated yet */ }
}

export async function getCrewByCode(code: string): Promise<Crew | null> {
  const sb = createClient();
  const { data } = await sb.from("crews").select("*").eq("invite_code", code.trim().toLowerCase()).single();
  return (data as Crew) ?? null;
}

export async function joinCrewByCode(code: string): Promise<Crew | null> {
  const sb = createClient();
  const me = await getMe();
  if (!me) return null;
  const crew = await getCrewByCode(code);
  if (!crew) return null;
  await sb.from("crew_members").upsert({ crew_id: crew.id, user_id: me.id }, { onConflict: "crew_id,user_id" });
  await denormMember(crew.id, me.id, me.name, me.avatar);
  return crew;
}

// ── Featured floor ───────────────────────────────────────────────────────────
// Day-1 content baked into the app so the Table is NEVER blank — no migration
// required. Honest ("from Marco", never fake friends). Photos ship in /public.
// When real featured cooks exist in the DB, those take over.
const LOCAL_FEATURED: Cook[] = [
  { id: "feat-shakshuka", user_id: null, crew_id: null, is_featured: true, title: "Shakshuka",         note: "15 min, one pan, unreal.",              photo_url: "/food/meal1.jpg", card_treatment: "polaroid", author_name: "Marco", author_avatar: "M", from_user: null, created_at: "2026-09-06T12:00:00Z" },
  { id: "feat-sticky",    user_id: null, crew_id: null, is_featured: true, title: "Sticky chicken",    note: "sticky, sweet, a little mean.",         photo_url: "/food/meal2.jpg", card_treatment: "poster",   author_name: "Marco", author_avatar: "M", from_user: null, created_at: "2026-09-05T12:00:00Z" },
  { id: "feat-tacos",     user_id: null, crew_id: null, is_featured: true, title: "Cajun fish tacos",  note: "the char is the whole point.",          photo_url: "/food/meal3.jpg", card_treatment: "receipt",  author_name: "Marco", author_avatar: "M", from_user: null, created_at: "2026-09-04T12:00:00Z" },
  { id: "feat-noodles",   user_id: null, crew_id: null, is_featured: true, title: "Thai curry noodles",note: "coconut broth you'll want to drink.",   photo_url: "/food/meal4.jpg", card_treatment: "polaroid", author_name: "Marco", author_avatar: "M", from_user: null, created_at: "2026-09-03T12:00:00Z" },
  { id: "feat-wings",     user_id: null, crew_id: null, is_featured: true, title: "Extra crispy wings",note: "shatteringly crunchy — napkins ready.", photo_url: "/food/meal5.jpg", card_treatment: "poster",   author_name: "Marco", author_avatar: "M", from_user: null, created_at: "2026-09-02T12:00:00Z" },
  { id: "feat-dumpling",  user_id: null, crew_id: null, is_featured: true, title: "Beef dumpling stew",note: "dumplings that hug you back.",          photo_url: "/food/meal6.jpg", card_treatment: "receipt",  author_name: "Marco", author_avatar: "M", from_user: null, created_at: "2026-09-01T12:00:00Z" },
];

// ── Cooks ────────────────────────────────────────────────────────────────────
export async function postCook(opts: {
  crewId: string | null;
  title: string;
  note: string;
  treatment: string;
  photoFile?: File | null;
  photoUrl?: string | null;   // fallback (e.g. a sample photo) when no file is picked
  fromUser?: string | null;
}): Promise<Cook | null> {
  const sb = createClient();
  const me = await getMe();
  if (!me) return null;

  let photo_url: string | null = opts.photoUrl ?? null;
  if (opts.photoFile) {
    const ext = opts.photoFile.name.split(".").pop() || "jpg";
    const path = `${me.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("cooks").upload(path, opts.photoFile, { upsert: true });
    if (!upErr) {
      photo_url = sb.storage.from("cooks").getPublicUrl(path).data.publicUrl;
    }
  }

  const { data, error } = await sb.from("cooks").insert({
    user_id: me.id,
    crew_id: opts.crewId,
    title: opts.title || null,
    note: opts.note || null,
    photo_url,
    card_treatment: opts.treatment,
    author_name: me.name,
    author_avatar: me.avatar,
    from_user: opts.fromUser ?? null,
  }).select("*").single();
  if (error) return null;
  return data as Cook;
}

// The Table feed: cooks from every crew I'm in (RLS already scopes this), plus
// my own, plus the featured "Marco" floor. Real crew/own cooks rank first
// (newest → oldest); featured cooks fill in below so the table is never blank.
// The Table is sacred to your crew — only real cooks from your people (RLS
// already scopes this). The Marco floor lives in Explore, not here.
export async function getTableCooks(limit = 30): Promise<Cook[]> {
  const sb = createClient();
  const { data } = await sb.from("cooks").select("*").order("created_at", { ascending: false }).limit(limit);
  const cooks = (data ?? []) as Cook[];
  return cooks.filter((c) => !c.is_featured);
}

// Who's seated at your table — you + your crew, for the seats visual. Member
// names/avatars are denormalized onto crew_members when present (see
// migration-social-3); degrades to "friend" seats before that migration runs.
export interface TableMember { id: string; name: string; avatar: string; isYou: boolean }

export async function getTable(): Promise<{ crew: Crew | null; members: TableMember[] }> {
  const sb = createClient();
  const me = await getMe();
  const crew = await getPrimaryCrew();
  const you: TableMember[] = me ? [{ id: me.id, name: me.name, avatar: me.avatar, isYou: true }] : [];
  if (!crew) return { crew: null, members: you };

  // Try the denormalized columns; fall back to bare rows if the migration
  // hasn't run yet, so this never breaks.
  let rows: { user_id: string; display_name?: string | null; avatar?: string | null }[] = [];
  const rich = await sb.from("crew_members").select("user_id, display_name, avatar").eq("crew_id", crew.id);
  if (rich.error) {
    const basic = await sb.from("crew_members").select("user_id").eq("crew_id", crew.id);
    rows = (basic.data ?? []) as { user_id: string }[];
  } else {
    rows = (rich.data ?? []) as typeof rows;
  }

  const members: TableMember[] = rows.map((r) => {
    const isYou = !!me && r.user_id === me.id;
    const name = (r.display_name || (isYou ? me?.name : null) || "friend") as string;
    return { id: r.user_id, name, avatar: r.avatar || name.slice(0, 1).toUpperCase(), isYou };
  });
  if (me && !members.some((m) => m.isYou)) members.unshift(you[0]);
  members.sort((a, b) => (a.isYou === b.isYou ? 0 : a.isYou ? -1 : 1)); // you first
  return { crew, members };
}

// Just the featured floor — used for the empty/onboarding state so we can label
// it honestly ("Fresh from Marco") separate from a user's own crew cooks.
export async function getFeaturedCooks(limit = 12): Promise<Cook[]> {
  const sb = createClient();
  const { data } = await sb.from("cooks").select("*").eq("is_featured", true).order("created_at", { ascending: false }).limit(limit);
  const featured = (data ?? []) as Cook[];
  return featured.length > 0 ? featured : LOCAL_FEATURED;
}

// ── Classes (live, via a third-party video room) ────────────────────────────
export interface CookClass {
  id: string;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  title: string;
  dish: string | null;
  description: string | null;
  cover_url: string | null;
  starts_at: string | null;
  capacity: number;
  price_cents: number;
  room_url: string | null;
  status: string;
  created_at: string;
}

export async function createClass(opts: {
  title: string; dish: string; description: string; startsAt: string | null; capacity: number; roomUrl: string; coverUrl?: string | null;
}): Promise<CookClass | null> {
  const sb = createClient();
  const me = await getMe();
  if (!me) return null;
  const { data, error } = await sb.from("classes").insert({
    host_id: me.id, host_name: me.name, host_avatar: me.avatar,
    title: opts.title, dish: opts.dish || null, description: opts.description || null,
    starts_at: opts.startsAt, capacity: opts.capacity, room_url: opts.roomUrl || null,
    cover_url: opts.coverUrl ?? null, price_cents: 0,
  }).select("*").single();
  if (error) return null;
  return data as CookClass;
}

export async function getUpcomingClasses(): Promise<CookClass[]> {
  const sb = createClient();
  const { data } = await sb.from("classes").select("*").neq("status", "ended").order("starts_at", { ascending: true, nullsFirst: false }).limit(30);
  return (data ?? []) as CookClass[];
}

export async function getClass(id: string): Promise<CookClass | null> {
  const sb = createClient();
  const { data } = await sb.from("classes").select("*").eq("id", id).single();
  return (data as CookClass) ?? null;
}

export async function registerForClass(id: string): Promise<boolean> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { error } = await sb.from("class_registrations").upsert({ class_id: id, user_id: user.id }, { onConflict: "class_id,user_id" });
  return !error;
}

export async function isRegistered(id: string): Promise<boolean> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb.from("class_registrations").select("id").eq("class_id", id).eq("user_id", user.id).maybeSingle();
  return !!data;
}

// ── Saves (Add to My Kitchen) ────────────────────────────────────────────────
export async function saveCook(cook: Cook): Promise<boolean> {
  // Baked-in featured cooks aren't real DB rows — nothing to reference yet.
  if (cook.id.startsWith("feat-")) return true;
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { error } = await sb.from("saves").insert({ user_id: user.id, cook_id: cook.id, from_user: cook.user_id });
  return !error;
}
