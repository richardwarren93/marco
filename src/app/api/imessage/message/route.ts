import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_ID, bridgeKey, findBindToken, hash, recipeUrl, senderKey, verify, verifyBind, type BindClaim } from "@/lib/imessage/protocol";
import { fetchRecipePage } from "@/lib/imessage/fetch-recipe";
import { extractPublicRecipe } from "@/lib/imessage/extract";
import { ensureParticipant } from "@/lib/imessage/identity";
import { handleDmText } from "@/lib/imessage/agent";
import { safeName } from "@/lib/imessage/names";

export const runtime = "nodejs";
export const maxDuration = 120;
const ORIGIN = "https://marco-eta-lyart.vercel.app";
const schema = z.object({ project: z.literal(PROJECT_ID), id: z.string().min(1).max(512), sender: z.string().min(1).max(512), text: z.string().max(8000), reaction: z.object({ emoji: z.string().max(32), targetId: z.string().min(1).max(512), removed: z.boolean().optional() }).strict().optional(), chat: z.object({ type: z.enum(["dm", "group"]), id: z.string().min(1).max(512) }).strict().optional() }).strict();

// Group chats Marco can sit in:
//   Household — bound to a household (household_groups): ONE shared kitchen.
//               Links dropped there save to the household creator's account,
//               which every member sees.
//   Table     — a family/friends chat bound to a crew (crew_groups): people
//               share what they cooked. Links are never saved for everyone; a
//               ❤️ saves one to the reactor's own kitchen.
//   Plain     — any other group: per-sender saves + heart-to-save.
// Binding is explicit only: a signed token (?m=…) in the seed message the app
// writes. Never inferred from who's in the thread. Legacy household_groups rows
// written by the old implicit auto-bind (bound_by IS NULL) are ignored.

type Admin = ReturnType<typeof createAdminClient>;
type Crew = { id: string; name: string; invite_code: string };
type DbError = { code?: string; message?: string } | null;

const UNAVAILABLE = "Marco is temporarily unavailable. Please try again later.";
const EXPIRED = "That invite has expired. Start the chat again from the Marco app.";
const TABLES_PENDING = "Tables in group chats are almost ready — send this invite here again a little later.";
const HOUSEHOLD_PENDING = "Household kitchens in group chats are almost ready — send this invite here again a little later.";
const INVITE_LABEL: Record<BindClaim["g"], string> = { household: "household kitchen", family: "family table", friends: "friends' table", table: "table" };
const INTRO = "Hi, I'm Marco 👨‍🍳 Text me a public recipe link and I'll save it to your Kitchen. Start a group chat with me from the Marco app: a household chat shares one kitchen, and a family or friends chat is a table for what you cooked. Try a link now.";

// crew_groups ships in its own migration. Until it runs, every group is
// unbound (no Tables) rather than the route failing.
let warnedNoCrewGroups = false;
function missingCrewGroups(error: DbError) {
  if (!error) return false;
  if (error.code !== "42P01" && error.code !== "PGRST205" && !/relation .*does not exist|could not find the table|schema cache/i.test(error.message ?? "")) return false;
  if (!warnedNoCrewGroups) { warnedNoCrewGroups = true; console.warn("[imessage] crew_groups is missing; run supabase/migration-imessage-table-groups.sql"); }
  return true;
}

const joinUrl = (crew: Crew) => `${ORIGIN}/join/${crew.invite_code}`;

// Marco's own pages (invite links, the app) are never recipes to extract.
function isMarcoUrl(url: string, request: Request) {
  const host = new URL(url).host;
  return host === new URL(ORIGIN).host || host === new URL(request.url).host || host === request.headers.get("host");
}

// "I made lasagna tonight!" → "Lasagna". Deterministic (no model call): only
// text shaped like a cook report gets past the group filter, and only a Table
// acts on it. Cautious on purpose — a missed cook costs less than a bogus post.
const COOKED = /^(?:marco[,:!]?\s+)?(?:i|we)\s+(?:just\s+)?(?:made|cooked|baked|grilled|roasted|whipped up|threw together)\s+(.+)$/iu;
const CLAUSE_BREAK = /\s*(?:[,;!?]|\.{2,}|…|\.(?=\s|$)|\s[-—–]\s|\s(?:and then|but|so|lol|haha)\s)/iu;
const TRAILING_EMOJI = /[\s\p{Extended_Pictographic}\u{FE0F}\u{200D}]+$/u;
const WHEN = /(?:^|\s+)(?:tonight|today|this (?:morning|afternoon|evening)|for (?:dinner|lunch|breakfast|brunch)|last night|again|too|lol|haha)$/i;
// "We made it!", "I made plans", "I made bank" — the verb fits, the object isn't food.
const NOT_A_DISH = /^(?:it|that|this|them|those|these|one|something|anything|nothing|everything|sure|plans?|progress|time|changes?|mistakes?|reservations?|appointments?|money|bank|friends?|team|call|decision|list|way|day|up|out|do|together|him|her|us|you|me|everyone|bed|mess|deal|promises?|jokes?|typos?|books|turn|flights?|offers?|bets?|history|noise|peace|sense|room|space|for|with|at|all|from|in|on|of|to|into)(?![\p{L}\p{N}])/iu;
const NOT_A_DISH_END = /(?:^|\s)(?:plans?|reservations?|money|progress|mistakes?|calls?|appointments?)$/i;
// Non-food nouns anywhere in the object ("a dentist appointment for Friday").
const NOT_FOOD = /\b(?:appointments?|appts?|payments?|deposits?|donations?|lists?|trains?|bus|buses|flights?|trips?|runs?|bucks|dollars|money|cash|teams?|roll|friends?|decisions?|calls?|wish(?:es)?|points?|cop(?:y|ies)|contacts?|reservations?|plans?|mistakes?|killing|varsity|playlists?|bed|beds|mess|deal|promises?|jokes?|typos?|videos?|posts?|websites?|apps?|sites?|cards?|signs?|changes?|progress|time|history|noise|peace|sense|room|space|offers?|bets?|goals?|shots?|baskets?|touchdowns?|cuts?|grades?|honor|deadline|appearance|bookings?|orders?|purchases?|transfers?)\b/i;
// "I made a run to Costco", "I made it to the gym" — a place/person tail.
const TAIL = /\s(?:to|at|on|from|in)\s/i;
// "…for the kids", "…with the family" — who it was for, not part of the dish.
const PEOPLE_TAIL = /\s+(?:for|with)\s+(?:the\s+)?(?:kids|family|fam|everyone|friends|crew|us|them|my\s+\w+|our\s+\w+)$/i;
const MEAL_TAIL = /\sfor\s(?:dinner|lunch|breakfast|brunch|the (?:kids|family|fam|table))\b/i;
function cookedTitle(text: string): string | null {
  if (text.length > 140 || text.includes("?") || /https?:|:\/\//i.test(text)) return null;
  const m = text.match(COOKED);
  if (!m) return null;
  let title = m[1].split(CLAUSE_BREAK)[0].replace(TRAILING_EMOJI, "").trim();
  for (let prev = ""; prev !== title; ) { prev = title; title = title.replace(WHEN, "").replace(PEOPLE_TAIL, "").replace(TRAILING_EMOJI, "").trim(); }
  title = title.replace(/^(?:a|an|some|the|this|that|my|our)\s+/i, "").trim();
  if (Array.from(title).length < 2 || title.length > 60 || NOT_A_DISH.test(title) || NOT_A_DISH_END.test(title) || NOT_FOOD.test(title)) return null;
  if (TAIL.test(` ${title} `) && !MEAL_TAIL.test(` ${title} `)) return null;
  if (/\d/.test(title) && !/^\d+\s?(?:-?minute|min|ingredient|layer|bean|cheese|alarm)/i.test(title)) return null;
  // "made" is the ambiguous verb — keep those short and dish-shaped.
  if (/^(?:marco[,:!]?\s+)?(?:i|we)\s+(?:just\s+)?made\s/i.test(text) && title.split(/\s+/).length > 4) return null;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// Which kind of group is this? A crew binding (Table) wins over a household
// row. null = couldn't tell (transient error) — the caller backs off rather
// than risk saving into the wrong kitchen.
async function groupMode(admin: Admin, groupHash: string): Promise<{ crew: Crew | null; householdOwner: string | null } | null> {
  const bound = await admin.from("crew_groups").select("crew_id").eq("group_hash", groupHash).maybeSingle();
  if (bound.error && !missingCrewGroups(bound.error)) return null;
  if (bound.data?.crew_id) {
    const crew = await admin.from("crews").select("id,name,invite_code").eq("id", bound.data.crew_id).maybeSingle();
    if (crew.error) return null;
    if (crew.data) return { crew: crew.data as Crew, householdOwner: null };
  }
  // Household chat: saves go to the shared kitchen (the creator's account).
  const householdId = await explicitHousehold(admin, groupHash);
  if (householdId === undefined) return null;
  if (!householdId) return { crew: null, householdOwner: null };
  const h = await admin.from("households").select("created_by").eq("id", householdId).maybeSingle();
  if (h.error) return null;
  return { crew: null, householdOwner: (h.data?.created_by as string | undefined) ?? null };
}

// The household this group was EXPLICITLY bound to (bound_by set by an
// invite), or null. undefined = transient error. Until the bound_by column
// exists (migration not run yet) legacy rows are honoured as they always were.
async function explicitHousehold(admin: Admin, groupHash: string): Promise<string | null | undefined> {
  const row = await admin.from("household_groups").select("household_id,bound_by").eq("group_hash", groupHash).maybeSingle();
  if (!row.error) return row.data?.bound_by ? (row.data.household_id as string) : null;
  if (missingColumn(row.error)) {
    const legacy = await admin.from("household_groups").select("household_id").eq("group_hash", groupHash).maybeSingle();
    return legacy.error ? null : ((legacy.data?.household_id as string | undefined) ?? null);
  }
  // household_groups itself missing → no household chats at all.
  return missingCrewGroups(row.error) ? null : undefined;
}
function missingColumn(error: DbError) {
  return !!error && (error.code === "42703" || error.code === "PGRST204" || /column .*does not exist|could not find the .*column/i.test(error.message ?? ""));
}

// The name + initial shown on cooks and table seats.
async function author(admin: Admin, userId: string) {
  const profile = await admin.from("user_profiles").select("display_name").eq("user_id", userId).maybeSingle();
  const name = (profile.data?.display_name as string | null | undefined)?.trim() || "Friend";
  return { name, avatar: (Array.from(name)[0] ?? "F").toUpperCase() };
}

// Bind this group from a verified invite: a Table (crew) or the household
// kitchen. The target must still exist and the person who started the chat
// must still belong to it. A chat that's ALREADY bound to something else only
// changes when the person who bound it re-sends an invite of their own, from
// their linked number — a forwarded invite, or a second person running the
// guide, can't move someone's chat. (Checkmarks are read from these bindings
// by /api/quests, so nothing else is written here.)
async function bindGroup(admin: Admin, groupHash: string, claim: BindClaim, senderUserId: string | null): Promise<string> {
  const [crewRow, house] = await Promise.all([
    admin.from("crew_groups").select("crew_id,created_by").eq("group_hash", groupHash).maybeSingle(),
    admin.from("household_groups").select("household_id,bound_by").eq("group_hash", groupHash).maybeSingle(),
  ]);
  if ((crewRow.error && !missingCrewGroups(crewRow.error)) || (house.error && !missingColumn(house.error) && !missingCrewGroups(house.error))) return UNAVAILABLE;
  const current = crewRow.data?.crew_id
    ? { k: "table" as const, id: crewRow.data.crew_id as string, by: (crewRow.data.created_by as string | null) ?? null }
    : house.data?.bound_by ? { k: "household" as const, id: house.data.household_id as string, by: house.data.bound_by as string } : null;
  if (current && !(current.k === claim.k && current.id === claim.id)) {
    const owner = senderUserId && senderUserId === claim.u && senderUserId === current.by;
    if (!owner) {
      if (!senderUserId) return `This chat is already ${current.k === "table" ? "a table" : "a household kitchen"}. If you started it and want to change it, link your number in Marco first (${ORIGIN}/connect/imessage), then send your invite here again.`;
      if (current.k === "table") {
        const crew = await admin.from("crews").select("id,name,invite_code").eq("id", current.id).maybeSingle();
        if (crew.data) return `This chat already has the ${safeName((crew.data as Crew).name)} 🍽️ Pull up a chair: ${joinUrl(crew.data as Crew)}`;
      }
      return `This chat is already ${current.k === "table" ? "a table" : "a household kitchen"}. Only the person who set it up can change it.`;
    }
  }
  if (claim.k === "table") {
    const [crew, member] = await Promise.all([
      admin.from("crews").select("id,name,invite_code").eq("id", claim.id).maybeSingle(),
      admin.from("crew_members").select("user_id").eq("crew_id", claim.id).eq("user_id", claim.u).limit(1).maybeSingle(),
    ]);
    if (crew.error || member.error) return UNAVAILABLE;
    if (!crew.data || !member.data) return EXPIRED;
    // A re-sent invite for the same table keeps the original binder.
    const by = current?.k === "table" && current.id === claim.id && current.by ? current.by : claim.u;
    const bound = await admin.from("crew_groups").upsert({ group_hash: groupHash, crew_id: claim.id, created_by: by }, { onConflict: "group_hash" });
    if (bound.error) return missingCrewGroups(bound.error) ? TABLES_PENDING : UNAVAILABLE;
    // A Table is never also the household kitchen.
    await admin.from("household_groups").delete().eq("group_hash", groupHash);
    return `Marco's at the ${safeName((crew.data as Crew).name)} 🍽️ Tap the link above to pull up a chair. Then tell me what you cooked ("I made lasagna") and I'll put it on the table. First time? Link your number in Marco: ${ORIGIN}/connect/imessage`;
  }
  const [home, member] = await Promise.all([
    admin.from("households").select("id").eq("id", claim.id).maybeSingle(),
    admin.from("household_members").select("user_id").eq("household_id", claim.id).eq("user_id", claim.u).limit(1).maybeSingle(),
  ]);
  if (home.error || member.error) return UNAVAILABLE;
  if (!home.data || !member.data) return EXPIRED;
  // Household row first (a leftover crew row still wins meanwhile, so a failure
  // here leaves a consistent table), then drop the Table binding.
  const by = current?.k === "household" && current.id === claim.id ? current.by : claim.u;
  const bound = await admin.from("household_groups").upsert({ household_id: claim.id, group_hash: groupHash, bound_by: by }, { onConflict: "group_hash" });
  if (bound.error) return missingColumn(bound.error) ? HOUSEHOLD_PENDING : UNAVAILABLE;
  const unbound = await admin.from("crew_groups").delete().eq("group_hash", groupHash);
  if (unbound.error && !missingCrewGroups(unbound.error)) return UNAVAILABLE;
  return "This is your shared household kitchen now 🍅 Drop a recipe link here and it lands in the kitchen you all share.";
}

// "I made lasagna" in a Table → a cook on that crew (no photo: the bridge
// doesn't carry images). Only for people sitting at the table — someone who
// left isn't silently re-seated; they get the link to pull up a chair again.
// Linked to one of their saved recipes when exactly one title matches exactly.
async function postCook(admin: Admin, crew: Crew, userId: string, title: string): Promise<string> {
  const seated = await admin.from("crew_members").select("user_id").eq("crew_id", crew.id).eq("user_id", userId).limit(1).maybeSingle();
  if (seated.error) return UNAVAILABLE;
  if (!seated.data) return `Pull up a chair at the ${safeName(crew.name)} first, then tell me again: ${joinUrl(crew)}`;
  const who = await author(admin, userId);
  const exact = await admin.from("recipes").select("id").eq("user_id", userId).ilike("title", title.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(2);
  const source = !exact.error && exact.data?.length === 1 ? (exact.data[0].id as string) : null;
  const cook = await admin.from("cooks").insert({ user_id: userId, crew_id: crew.id, title, note: null, photo_url: null, card_treatment: "polaroid", author_name: who.name, author_avatar: who.avatar, source_recipe_id: source });
  if (cook.error) { console.warn("[imessage] Cook insert failed", cook.error.code); return "Couldn't put that on the table just now. Please try again."; }
  return `On the ${safeName(crew.name)} 🍳 ${ORIGIN}/friends-stack`;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 12000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !verify(bridgeKey(secret), request.headers.get("x-marco-time") || "", raw, request.headers.get("x-marco-signature") || "")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  const { sender, text, id, chat, reaction } = parsed.data;
  const group = chat?.type === "group";
  if (reaction && (!group || !["❤️", "❤"].includes(reaction.emoji) || reaction.removed)) return NextResponse.json({ reply: null });
  const command = reaction ? "" : text.trim();
  const code = command.match(/^link\s+([a-f0-9]{24})$/i);
  const account = /^(link|stop|disconnect)$/i.test(command);
  // A signed invite from the app (?m=…) binds a group. It's never a recipe.
  const bindToken = reaction ? null : findBindToken(command);
  let url = bindToken ? null : recipeUrl(command);
  // Cook talk ("I made lasagna") only gets through so a Table can act on it.
  const cooked = group && !reaction && !bindToken ? cookedTitle(command) : null;
  // Groups stay quiet unless it's an invite, a link, a cook, a heart, or an account command.
  if (group && !reaction && !bindToken && !url && !code && !account && !cooked) return NextResponse.json({ reply: null });
  const who = senderKey(sender);
  const receipt = hash(group ? JSON.stringify([PROJECT_ID, "group", chat.id, sender, id]) : `${PROJECT_ID}:${id}`);
  const groupHash = group ? hash(JSON.stringify([PROJECT_ID, "group", chat.id])) : null;
  const admin = createAdminClient();
  const messageKey = (messageId: string) => hash(JSON.stringify([PROJECT_ID, chat?.id, messageId]));
  if (reaction) {
    // A ❤️ only means something on a recipe link Marco saw shared here.
    const shared = await admin.from("imessage_shared_recipes").select("source_url").eq("message_key", messageKey(reaction.targetId)).maybeSingle();
    if (shared.error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    if (!shared.data) return NextResponse.json({ reply: null });
    url = recipeUrl(shared.data.source_url);
    if (!url) return NextResponse.json({ reply: null });
  }
  let marcoLink = false;
  if (url && isMarcoUrl(url, request)) {
    if (group) return NextResponse.json({ reply: null });
    marcoLink = true;
    url = null;
  }

  // Read the group's mode BEFORE the receipt, so the quiet paths below don't
  // spend a receipt or the sender's daily budget.
  let crew: Crew | null = null;
  let householdOwner: string | null = null;
  if (groupHash && (url || cooked)) {
    const mode = await groupMode(admin, groupHash);
    if (!mode) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    ({ crew, householdOwner } = mode);
  }
  // Table + link: never saved for anyone. Remember it so a ❤️ saves it to the
  // reactor's own kitchen, and say nothing.
  if (crew && url && !reaction) {
    const stored = await admin.from("imessage_shared_recipes").upsert({ message_key: messageKey(id), source_url: url });
    if (stored.error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    return NextResponse.json({ reply: null });
  }
  // Cook talk anywhere but a Table is just conversation.
  if (cooked && !crew) return NextResponse.json({ reply: null });

  const claimed = await admin.from("imessage_receipts").insert({ id: receipt, sender_hash: who, group_hash: groupHash });
  if (claimed.error) {
    if (claimed.error.code !== "23505") return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    const prior = await admin.from("imessage_receipts").select("reply,sender_hash").eq("id", receipt).single();
    return NextResponse.json({ reply: prior.data?.sender_hash === who ? prior.data.reply : null });
  }
  async function finish(reply: string) {
    const stored = await admin.from("imessage_receipts").update({ reply }).eq("id", receipt);
    if (stored.error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    return NextResponse.json({ reply });
  }
  const count = await admin.from("imessage_receipts").select("id", { head: true, count: "exact" }).eq("sender_hash", who).gte("created_at", new Date(Date.now() - 86400000).toISOString());
  if (count.error) return finish(UNAVAILABLE);
  if (group && (code || account)) {
    if (code) {
      const revoked = await admin.from("imessage_codes").delete().eq("code_hash", hash(code[1].toLowerCase()));
      if (revoked.error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    }
    return finish(code ? "Connection codes must stay private. Create a fresh code and send it to Marco in a direct message." : "Please message Marco directly to connect or disconnect your account.");
  }
  if (/^(stop|disconnect)$/i.test(command)) {
    const removed = await admin.from("imessage_links").delete().eq("sender_hash", who);
    return finish(removed.error ? "Could not disconnect. Please retry." : "Disconnected. Recipe saving is off. Send LINK if you want to reconnect.");
  }
  if ((count.count ?? 100) > 30) return finish("You've reached 30 messages today. Please use the Marco app or try tomorrow.");
  if (code) {
    // Claim: bind this handle to a real account and fold in anything saved so far.
    const linked = await admin.rpc("claim_and_merge_imessage_code", { p_hash: hash(code[1].toLowerCase()), p_sender: who });
    return finish(!linked.error && linked.data === true ? `Linked to your Marco account! Everything you've saved by text is in your Kitchen: ${ORIGIN}/recipes\nText STOP to disconnect.` : `That code expired, was used, or didn't match. Create a fresh one here: ${ORIGIN}/connect/imessage`);
  }
  const link = await admin.from("imessage_links").select("user_id,claimed").eq("sender_hash", who).maybeSingle();
  if (link.error) return finish(UNAVAILABLE);

  // ── Invite: bind the group (or explain, in a DM) ──
  if (bindToken) {
    const claim = verifyBind(secret, bindToken);
    if (!claim) return finish(EXPIRED);
    if (!groupHash) return finish(`That's the invite for your ${INVITE_LABEL[claim.g]}. Start a new group chat with your people and me, and send it there.`);
    return finish(await bindGroup(admin, groupHash, claim, link.data?.claimed === true ? (link.data.user_id as string) : null));
  }

  // ── Table: "I made X" → a cook on the table (linked, claimed numbers only) ──
  if (cooked && crew) {
    if (!link.data || link.data.claimed !== true) return finish(`Want that on the ${safeName(crew.name)}? Link your number in Marco first: ${ORIGIN}/connect/imessage`);
    return finish(await postCook(admin, crew, link.data.user_id as string, cooked));
  }

  if (marcoLink) return finish("That's a Marco link — send me a recipe page instead.");
  if (!url) {
    // Only DMs reach this (group chatter was filtered out above). A brand-new
    // DMer gets the intro; anyone who's saved before gets the smart layer (ask
    // for saves, what to cook, schedule one, or log a cook — no verbs required).
    if (group) return NextResponse.json({ reply: null });
    if (!link.data) return finish(INTRO);
    return finish(await handleDmText(admin, link.data.user_id, command, link.data.claimed ?? true, ORIGIN));
  }

  // ── Saving a link: a DM, a ❤️ in any group, or a link in a household/plain group ──
  // First contact with a real link: give them an instant, no-signup identity.
  const userId = link.data?.user_id ?? await ensureParticipant(admin, who);
  if (!userId) return finish(UNAVAILABLE);
  const isClaimed = link.data?.claimed ?? false;
  // In a household group, a save belongs to the shared household kitchen (the
  // creator's account) so every member gets it. In a Table (householdOwner is
  // always null there) a ❤️ saves to the reactor's own kitchen.
  const saveOwner = householdOwner ?? userId;
  // A placeholder (unclaimed) texter can't sign into the app yet, so nudge them
  // to link their number instead of handing them an app link they can't open.
  const dmTail = isClaimed ? "" : `\nSee & manage them in the app — link your number: ${ORIGIN}/connect/imessage`;
  const existing = await admin.from("recipes").select("id,title").eq("user_id", saveOwner).eq("source_url", url).limit(1).maybeSingle();
  if (existing.error) return finish("Could not check your Kitchen. Please try again later.");
  async function rememberSharedRecipe() {
    if (!group || reaction) return;
    const stored = await admin.from("imessage_shared_recipes").upsert({ message_key: messageKey(id), source_url: url });
    if (stored.error) throw new Error("Could not record shared recipe");
  }
  const groupSaved = householdOwner
    ? "Saved to your household kitchen 👨‍🍳 Everyone in your household has it now."
    : (reaction ? "Saved to your Kitchen 👨‍🍳" : "Saved to your Kitchen 👨‍🍳\nWant this recipe too? Heart the original link to save it.");
  if (existing.data) {
    try { await rememberSharedRecipe(); } catch { return finish("Your recipe is saved, but heart-to-save is temporarily unavailable. Please resend the link."); }
    return finish(group ? (householdOwner ? "Already in your household kitchen 👨‍🍳" : (reaction ? "Already in your Kitchen 👨‍🍳" : "Already in your Kitchen 👨‍🍳\nWant this recipe too? Heart the original link to save it.")) : (isClaimed ? `Already saved: ${existing.data.title}\n${ORIGIN}/recipes/${existing.data.id}` : `Already in your Kitchen: ${existing.data.title}${dmTail}`));
  }
  try {
    const content = await fetchRecipePage(url);
    const recipe = await extractPublicRecipe(content);
    if (!recipe.title || !recipe.ingredients?.length || !recipe.steps?.length) return finish("I couldn't find a complete recipe on that page. Try a public page with ingredients and instructions.");
    // Disconnecting during extraction must prevent a new save.
    const current = await admin.from("imessage_links").select("user_id").eq("sender_hash", who).maybeSingle();
    if (current.error || current.data?.user_id !== userId) return finish("Your account was disconnected. This recipe was not saved.");
    const result = await admin.from("recipes").insert({ user_id: saveOwner, title: recipe.title, description: recipe.description || null, ingredients: recipe.ingredients, steps: recipe.steps, servings: recipe.servings || null, prep_time_minutes: recipe.prep_time_minutes || null, cook_time_minutes: recipe.cook_time_minutes || null, tags: [], meal_type: "dinner", source_url: url, source_platform: "other" }).select("id").single();
    if (result.error) { console.warn("[imessage] Recipe insert failed", result.error.code); throw new Error("Save failed"); }
    await rememberSharedRecipe();
    return finish(group ? groupSaved : (isClaimed ? `Saved ${recipe.title} to your Kitchen 👨‍🍳\n${ORIGIN}/recipes/${result.data.id}` : `Saved ${recipe.title} to your Kitchen 👨‍🍳${dmTail}`));
  } catch (error) {
    console.warn("[imessage] Save failed", error instanceof Error ? error.name : "Unknown error");
    if (error instanceof Error && error.message.includes("credit balance")) return finish("This page needs AI extraction, which is temporarily unavailable. Try a recipe page with a recipe card, or save it in Marco later.");
    return finish("I couldn't save that page. It may be private or unsupported. Try a public recipe page, or save it in the Marco app.");
  }
}
