import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_ID, bridgeKey, hash, recipeUrl, senderKey, verify } from "@/lib/imessage/protocol";
import { fetchRecipePage } from "@/lib/imessage/fetch-recipe";
import { extractPublicRecipe } from "@/lib/imessage/extract";
import { ensureParticipant } from "@/lib/imessage/identity";
import { handleDmText } from "@/lib/imessage/agent";

export const runtime = "nodejs";
export const maxDuration = 120;
const ORIGIN = "https://marco-eta-lyart.vercel.app";

// Marco is a 1:1 assistant. He used to sit in group chats too — a household
// chat saved to one shared kitchen, a family/friends chat was a "Table" where
// people posted what they cooked, and a ❤️ on a link saved it to the reactor's
// own kitchen. All of that was removed on 2026-11-22 along with the in-app
// flow that created those chats. Group messages are now acknowledged and
// ignored, rather than rejected, so the bridge relay needs no change.
//
// The tables that fed it (`household_groups`, `crew_groups`,
// `imessage_shared_recipes`) are deliberately left in the database.

const schema = z.object({
  project: z.literal(PROJECT_ID),
  id: z.string().min(1).max(512),
  sender: z.string().min(1).max(512),
  text: z.string().max(8000),
  // Still accepted so the relay's payload stays valid; both are ignored.
  reaction: z.object({ emoji: z.string().max(32), targetId: z.string().min(1).max(512), removed: z.boolean().optional() }).strict().optional(),
  chat: z.object({ type: z.enum(["dm", "group"]), id: z.string().min(1).max(512) }).strict().optional(),
}).strict();

type Admin = ReturnType<typeof createAdminClient>;

const UNAVAILABLE = "Marco is temporarily unavailable. Please try again later.";
const INTRO = "Hi, I'm Marco 👨‍🍳 Text me a public recipe link and I'll save it to your Kitchen. Ask me what to cook, put something on your plan, or tell me what you made. Try a link now.";

// Marco's own pages (the app, invite links) are never recipes to extract.
function isMarcoUrl(url: string, request: Request) {
  const host = new URL(url).host;
  return host === new URL(ORIGIN).host || host === new URL(request.url).host || host === request.headers.get("host");
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

  // Not in group chats any more, and reactions only ever meant something there.
  if (chat?.type === "group" || reaction) return NextResponse.json({ reply: null });

  const command = text.trim();
  const code = command.match(/^link\s+([a-f0-9]{24})$/i);
  let url = recipeUrl(command);
  const who = senderKey(sender);
  const receipt = hash(`${PROJECT_ID}:${id}`);
  const admin: Admin = createAdminClient();

  let marcoLink = false;
  if (url && isMarcoUrl(url, request)) { marcoLink = true; url = null; }

  // One reply per message, even if the relay retries.
  const claimed = await admin.from("imessage_receipts").insert({ id: receipt, sender_hash: who, group_hash: null });
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

  if (marcoLink) return finish("That's a Marco link — send me a recipe page instead.");
  if (!url) {
    // A brand-new texter gets the intro; anyone who's saved before gets the
    // smart layer (ask for saves, what to cook, schedule one, or log a cook —
    // no verbs required).
    if (!link.data) return finish(INTRO);
    return finish(await handleDmText(admin, link.data.user_id, command, link.data.claimed ?? true, ORIGIN));
  }

  // ── Saving a link ─────────────────────────────────────────────────────────
  // First contact with a real link: give them an instant, no-signup identity.
  const userId = link.data?.user_id ?? await ensureParticipant(admin, who);
  if (!userId) return finish(UNAVAILABLE);
  const isClaimed = link.data?.claimed ?? false;
  // A placeholder (unclaimed) texter can't sign into the app yet, so nudge them
  // to link their number instead of handing them an app link they can't open.
  const tail = isClaimed ? "" : `\nSee & manage them in the app — link your number: ${ORIGIN}/connect/imessage`;
  const existing = await admin.from("recipes").select("id,title").eq("user_id", userId).eq("source_url", url).limit(1).maybeSingle();
  if (existing.error) return finish("Could not check your Kitchen. Please try again later.");
  if (existing.data) {
    return finish(isClaimed ? `Already saved: ${existing.data.title}\n${ORIGIN}/recipes/${existing.data.id}` : `Already in your Kitchen: ${existing.data.title}${tail}`);
  }
  try {
    const content = await fetchRecipePage(url);
    const recipe = await extractPublicRecipe(content);
    if (!recipe.title || !recipe.ingredients?.length || !recipe.steps?.length) return finish("I couldn't find a complete recipe on that page. Try a public page with ingredients and instructions.");
    // Disconnecting during extraction must prevent a new save.
    const current = await admin.from("imessage_links").select("user_id").eq("sender_hash", who).maybeSingle();
    if (current.error || current.data?.user_id !== userId) return finish("Your account was disconnected. This recipe was not saved.");
    const result = await admin.from("recipes").insert({ user_id: userId, title: recipe.title, description: recipe.description || null, ingredients: recipe.ingredients, steps: recipe.steps, servings: recipe.servings || null, prep_time_minutes: recipe.prep_time_minutes || null, cook_time_minutes: recipe.cook_time_minutes || null, tags: [], meal_type: "dinner", source_url: url, source_platform: "other" }).select("id").single();
    if (result.error) { console.warn("[imessage] Recipe insert failed", result.error.code); throw new Error("Save failed"); }
    return finish(isClaimed ? `Saved ${recipe.title} to your Kitchen 👨‍🍳\n${ORIGIN}/recipes/${result.data.id}` : `Saved ${recipe.title} to your Kitchen 👨‍🍳${tail}`);
  } catch (error) {
    console.warn("[imessage] Save failed", error instanceof Error ? error.name : "Unknown error");
    if (error instanceof Error && error.message.includes("credit balance")) return finish("This page needs AI extraction, which is temporarily unavailable. Try a recipe page with a recipe card, or save it in Marco later.");
    return finish("I couldn't save that page. It may be private or unsupported. Try a public recipe page, or save it in the Marco app.");
  }
}
