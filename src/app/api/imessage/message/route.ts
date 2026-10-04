import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_ID, bridgeKey, hash, recipeUrl, senderKey, verify } from "@/lib/imessage/protocol";
import { fetchRecipePage } from "@/lib/imessage/fetch-recipe";
import { extractPublicRecipe } from "@/lib/imessage/extract";
import { ensureParticipant } from "@/lib/imessage/identity";

export const runtime = "nodejs";
export const maxDuration = 120;
const ORIGIN = "https://marco-eta-lyart.vercel.app";
const schema = z.object({ project: z.literal(PROJECT_ID), id: z.string().min(1).max(512), sender: z.string().min(1).max(512), text: z.string().max(8000), reaction: z.object({ emoji: z.string().max(32), targetId: z.string().min(1).max(512), removed: z.boolean().optional() }).strict().optional(), chat: z.object({ type: z.enum(["dm", "group"]), id: z.string().min(1).max(512) }).strict().optional() }).strict();

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
  if (group && !reaction && !recipeUrl(command) && !code && !/^(link|stop|disconnect)$/i.test(command)) return NextResponse.json({ reply: null });
  const who = senderKey(sender);
  const receipt = hash(group ? JSON.stringify([PROJECT_ID, "group", chat.id, sender, id]) : `${PROJECT_ID}:${id}`);
  const admin = createAdminClient();
  const messageKey = (messageId: string) => hash(JSON.stringify([PROJECT_ID, chat?.id, messageId]));
  let url = recipeUrl(command);
  if (reaction) {
    const shared = await admin.from("imessage_shared_recipes").select("source_url").eq("message_key", messageKey(reaction.targetId)).maybeSingle();
    if (shared.error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    if (!shared.data) return NextResponse.json({ reply: "I don't have that recipe link yet. Share the original URL again, then heart that message to save it." });
    url = recipeUrl(shared.data.source_url);
    if (!url) return NextResponse.json({ reply: null });
  }
  const groupHash = group ? hash(JSON.stringify([PROJECT_ID, "group", chat.id])) : null;
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
  if (count.error) return finish("Marco is temporarily unavailable. Please try again later.");
  if (group && (code || /^(link|stop|disconnect)$/i.test(command))) {
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
  if (link.error) return finish("Marco is temporarily unavailable. Please try again later.");

  if (!url) return finish(link.data
    ? "Send a public recipe link and I'll save it to your Kitchen. Text STOP to disconnect."
    : "Hi, I'm Marco 👨‍🍳 Text me a public recipe link and I'll save it — or ❤️ a recipe link in a group chat to save that one. Try it now.");
  // First contact with a real link: give them an instant, no-signup identity.
  const userId = link.data?.user_id ?? await ensureParticipant(admin, who);
  if (!userId) return finish("Marco is temporarily unavailable. Please try again later.");
  const isClaimed = link.data?.claimed ?? false;
  // A placeholder (unclaimed) texter can't sign into the app yet, so nudge them
  // to link their number instead of handing them an app link they can't open.
  const dmTail = isClaimed ? "" : `\nSee & manage them in the app — link your number: ${ORIGIN}/connect/imessage`;
  const existing = await admin.from("recipes").select("id,title").eq("user_id", userId).eq("source_url", url).limit(1).maybeSingle();
  if (existing.error) return finish("Could not check your Kitchen. Please try again later.");
  async function rememberSharedRecipe() {
    if (!group || reaction) return;
    const stored = await admin.from("imessage_shared_recipes").upsert({ message_key: messageKey(id), source_url: url });
    if (stored.error) throw new Error("Could not record shared recipe");
  }
  const groupSaved = reaction ? "Saved to your Kitchen 👨‍🍳" : "Saved to your Kitchen 👨‍🍳\nWant this recipe too? Heart the original link to save it.";
  if (existing.data) {
    try { await rememberSharedRecipe(); } catch { return finish("Your recipe is saved, but heart-to-save is temporarily unavailable. Please resend the link."); }
    return finish(group ? (reaction ? "Already in your Kitchen 👨‍🍳" : "Already in your Kitchen 👨‍🍳\nWant this recipe too? Heart the original link to save it.") : (isClaimed ? `Already saved: ${existing.data.title}\n${ORIGIN}/recipes/${existing.data.id}` : `Already in your Kitchen: ${existing.data.title}${dmTail}`));
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
    await rememberSharedRecipe();
    return finish(group ? groupSaved : (isClaimed ? `Saved ${recipe.title} to your Kitchen 👨‍🍳\n${ORIGIN}/recipes/${result.data.id}` : `Saved ${recipe.title} to your Kitchen 👨‍🍳${dmTail}`));
  } catch (error) {
    console.warn("[imessage] Save failed", error instanceof Error ? error.name : "Unknown error");
    if (error instanceof Error && error.message.includes("credit balance")) return finish("This page needs AI extraction, which is temporarily unavailable. Try a recipe page with a recipe card, or save it in Marco later.");
    return finish("I couldn't save that page. It may be private or unsupported. Try a public recipe page, or save it in the Marco app.");
  }
}
