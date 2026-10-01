import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_ID, bridgeKey, hash, recipeUrl, senderKey, verify } from "@/lib/imessage/protocol";
import { fetchRecipePage } from "@/lib/imessage/fetch-recipe";
import { extractPublicRecipe } from "@/lib/imessage/extract";

export const runtime = "nodejs";
export const maxDuration = 120;
const ORIGIN = "https://marco-eta-lyart.vercel.app";
const schema = z.object({ project: z.literal(PROJECT_ID), id: z.string().min(1).max(512), sender: z.string().min(1).max(512), text: z.string().min(1).max(8000) }).strict();

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 12000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !verify(bridgeKey(secret), request.headers.get("x-marco-time") || "", raw, request.headers.get("x-marco-signature") || "")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  const { sender, text, id } = parsed.data;
  const who = senderKey(sender); const receipt = hash(`${PROJECT_ID}:${id}`);
  const admin = createAdminClient();
  const claimed = await admin.from("imessage_receipts").insert({ id: receipt, sender_hash: who });
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
  const command = text.trim();
  if (/^(stop|disconnect)$/i.test(command)) {
    const removed = await admin.from("imessage_links").delete().eq("sender_hash", who);
    return finish(removed.error ? "Could not disconnect. Please retry." : "Disconnected. Recipe saving is off. Send LINK if you want to reconnect.");
  }
  if ((count.count ?? 100) > 30) return finish("You've reached 30 messages today. Please use the Marco app or try tomorrow.");
  const code = command.match(/^link\s+([a-f0-9]{24})$/i);
  if (code) {
    const linked = await admin.rpc("claim_imessage_code", { p_hash: hash(code[1].toLowerCase()), p_sender: who });
    return finish(!linked.error && linked.data === true ? "Connected to Marco! Send a public recipe link to save it to your Kitchen. Text STOP to disconnect." : `That code expired, was used, or an account is already connected. Check your connection and create a new code: ${ORIGIN}/connect/imessage`);
  }
  const link = await admin.from("imessage_links").select("user_id").eq("sender_hash", who).maybeSingle();
  if (link.error) return finish("Marco is temporarily unavailable. Please try again later.");
  if (!link.data) return finish(`Connect your Marco account here, then text back the connection code: ${ORIGIN}/connect/imessage\nAfter connecting, resend your recipe link.`);
  const url = recipeUrl(command);
  if (!url) return finish("Send one public HTTPS recipe link to save it to your Kitchen. Text STOP to disconnect. Cooking reminders and grocery ordering aren't available here yet.");
  const userId = link.data.user_id;
  const existing = await admin.from("recipes").select("id,title").eq("user_id", userId).eq("source_url", url).limit(1).maybeSingle();
  if (existing.error) return finish("Could not check your Kitchen. Please try again later.");
  if (existing.data) return finish(`Already saved: ${existing.data.title}\n${ORIGIN}/recipes/${existing.data.id}`);
  try {
    const content = await fetchRecipePage(url);
    const recipe = await extractPublicRecipe(content);
    if (!recipe.title || !recipe.ingredients?.length || !recipe.steps?.length) return finish("I couldn't find a complete recipe on that page. Try a public page with ingredients and instructions.");
    // Disconnecting during extraction must prevent a new save.
    const current = await admin.from("imessage_links").select("user_id").eq("sender_hash", who).maybeSingle();
    if (current.error || current.data?.user_id !== userId) return finish("Your account was disconnected. This recipe was not saved.");
    const result = await admin.from("recipes").insert({ user_id: userId, title: recipe.title, description: recipe.description || null, ingredients: recipe.ingredients, steps: recipe.steps, servings: recipe.servings || null, prep_time_minutes: recipe.prep_time_minutes || null, cook_time_minutes: recipe.cook_time_minutes || null, tags: [], meal_type: "dinner", source_url: url, source_platform: "other" }).select("id").single();
    if (result.error) { console.warn("[imessage] Recipe insert failed", result.error.code); throw new Error("Save failed"); }
    return finish(`Saved ${recipe.title} to your Kitchen.\n${ORIGIN}/recipes/${result.data.id}`);
  } catch (error) {
    console.warn("[imessage] Save failed", error instanceof Error ? error.name : "Unknown error");
    if (error instanceof Error && error.message.includes("credit balance")) return finish("This page needs AI extraction, which is temporarily unavailable. Try a recipe page with a recipe card, or save it in Marco later.");
    return finish("I couldn't save that page. It may be private or unsupported. Try a public recipe page, or save it in the Marco app.");
  }
}
