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
  source_recipe_id?: string | null; // the recipe a friend can Cook from this post
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
  // Plain insert (NOT upsert): an ON CONFLICT upsert needs an UPDATE policy on
  // crew_members that doesn't exist, so RLS rejects it. Name/avatar go in here.
  await sb.from("crew_members").insert({ crew_id: crew.id, user_id: me.id, role: "owner", display_name: me.name, avatar: me.avatar });
  return crew as Crew;
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
  // Plain insert (see createCrew): upsert's ON CONFLICT is blocked by RLS.
  // A duplicate (already a member) is success, not a failure.
  const { error } = await sb.from("crew_members").insert({ crew_id: crew.id, user_id: me.id, display_name: me.name, avatar: me.avatar });
  if (error && error.code !== "23505") return null; // 23505 = unique violation = already joined
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
  sourceRecipeId?: string | null; // the extracted/attached recipe to Cook from
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
    source_recipe_id: opts.sourceRecipeId ?? null,
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

type Me = { id: string; name: string; avatar: string };

// Seated members of one crew (denormalized names when migration-social-3 ran;
// degrades to "friend" otherwise). You always appear, first.
async function crewMembers(crewId: string, me: Me | null): Promise<TableMember[]> {
  const sb = createClient();
  let rows: { user_id: string; display_name?: string | null; avatar?: string | null }[] = [];
  const rich = await sb.from("crew_members").select("user_id, display_name, avatar").eq("crew_id", crewId);
  if (rich.error) {
    const basic = await sb.from("crew_members").select("user_id").eq("crew_id", crewId);
    rows = (basic.data ?? []) as { user_id: string }[];
  } else {
    rows = (rich.data ?? []) as typeof rows;
  }
  const members: TableMember[] = rows.map((r) => {
    const isYou = !!me && r.user_id === me.id;
    const name = (r.display_name || (isYou ? me?.name : null) || "friend") as string;
    return { id: r.user_id, name, avatar: r.avatar || name.slice(0, 1).toUpperCase(), isYou };
  });
  if (me && !members.some((m) => m.isYou)) members.unshift({ id: me.id, name: me.name, avatar: me.avatar, isYou: true });
  members.sort((a, b) => (a.isYou === b.isYou ? 0 : a.isYou ? -1 : 1)); // you first
  return members;
}

export async function getTable(): Promise<{ crew: Crew | null; members: TableMember[] }> {
  const me = await getMe();
  const crew = await getPrimaryCrew();
  const you: TableMember[] = me ? [{ id: me.id, name: me.name, avatar: me.avatar, isYou: true }] : [];
  if (!crew) return { crew: null, members: you };
  return { crew, members: await crewMembers(crew.id, me) };
}

// All the tables you're in, each with its seated members — for the rotating
// seats strip. (The feed stays aggregate across every table.)
export async function getTables(): Promise<{ crew: Crew; members: TableMember[] }[]> {
  const me = await getMe();
  const crews = await getMyCrews();
  return Promise.all(crews.map(async (crew) => ({ crew, members: await crewMembers(crew.id, me) })));
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
  const { error } = await sb.from("class_registrations").insert({ class_id: id, user_id: user.id });
  return !error || error.code === "23505"; // already registered = success (upsert would be blocked by RLS)
}

export async function isRegistered(id: string): Promise<boolean> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb.from("class_registrations").select("id").eq("class_id", id).eq("user_id", user.id).maybeSingle();
  return !!data;
}

// ── Recipe attach / auto-extract ─────────────────────────────────────────────
// Reuse the existing extractors: the cook photo (Marco reads it), or a link /
// pasted text (more accurate). Persist via /api/recipes/save and return the new
// recipe id to stamp onto the cook. Best-effort — returns null on any failure
// (unauth, extractor error) so posting a cook never blocks on it.
export type RecipeSource =
  | { kind: "photo"; file: File }
  | { kind: "link"; url: string }
  | { kind: "text"; text: string };

export async function extractAndSaveRecipe(source: RecipeSource): Promise<string | null> {
  try {
    let recipe: Record<string, unknown> | null = null;
    if (source.kind === "photo") {
      const fd = new FormData();
      fd.append("file", source.file);
      const r = await fetch("/api/recipes/extract-image", { method: "POST", body: fd });
      if (!r.ok) return null;
      recipe = (await r.json()).recipe ?? null;
    } else if (source.kind === "link") {
      const r = await fetch("/api/recipes/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: source.url }) });
      if (!r.ok) return null;
      recipe = (await r.json()).recipe ?? null;
    } else {
      const r = await fetch("/api/recipes/extract-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: source.text }) });
      if (!r.ok) return null;
      recipe = (await r.json()).recipe ?? null;
    }
    if (!recipe || !recipe.title) return null;
    const s = await fetch("/api/recipes/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recipe) });
    if (s.ok) return ((await s.json()).recipe?.id as string) ?? null;
    if (s.status === 409) return ((await s.json()).recipeId as string) ?? null; // dup → reuse existing
    return null;
  } catch { return null; }
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
