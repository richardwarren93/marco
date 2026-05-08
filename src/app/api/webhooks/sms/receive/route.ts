import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTwilioSignature, sendSms, normalizePhone } from "@/lib/sms/twilio";
import { classifyIntent } from "@/lib/sms/intent";
import {
  handleSaveRecipe,
  handleFindRecipe,
  handleChat,
  helpReply,
  rateLimitReply,
  unknownSenderReply,
} from "@/lib/sms/handlers";
import { checkRateLimit } from "@/lib/rate-limit";

const SMS_DAILY_LIMIT = 30;

// Build TwiML response. Twilio webhooks expect XML; an empty <Response/> means
// "don't auto-reply". We always send via the REST API instead so we can compose
// the reply after async work without Twilio's 15-second TwiML timeout.
function emptyTwiml(): NextResponse {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

// Reconstruct the full URL Twilio used to call us. Behind a proxy (Vercel),
// the host header is correct but `request.url` reflects the internal URL.
function reconstructUrl(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}${url.pathname}${url.search}`;
}

export async function POST(request: Request) {
  // Twilio posts application/x-www-form-urlencoded
  const formData = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  const signature = request.headers.get("x-twilio-signature");
  const reconstructed = reconstructUrl(request);
  if (!validateTwilioSignature(reconstructed, params, signature)) {
    console.warn("[sms/receive] invalid Twilio signature");
    return new NextResponse("Forbidden", { status: 403 });
  }

  const fromRaw = params.From;
  const body = params.Body || "";
  const messageSid = params.MessageSid;
  if (!fromRaw) return emptyTwiml();

  const from = normalizePhone(fromRaw) || fromRaw;
  const admin = createAdminClient();

  // Resolve user by verified phone.
  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("phone", from)
    .not("phone_verified_at", "is", null)
    .maybeSingle();

  // Log inbound regardless (helps debug unknown-sender flow).
  admin.from("sms_messages").insert({
    user_id: profile?.user_id || null,
    direction: "inbound",
    from_number: from,
    to_number: params.To || "",
    body,
    twilio_sid: messageSid || null,
  }).then(() => {}, () => {});

  if (!profile) {
    // Unknown sender — single onboarding reply, no rate-limit table touched.
    try {
      await sendSms(from, unknownSenderReply());
    } catch (err) {
      console.error("[sms/receive] reply to unknown sender failed:", err);
    }
    return emptyTwiml();
  }

  const userId = profile.user_id;

  // Rate-limit BEFORE doing the AI/work so abuse is cheap to deny.
  const { allowed } = await checkRateLimit(userId, "sms", SMS_DAILY_LIMIT);
  if (!allowed) {
    try {
      await sendSms(from, rateLimitReply());
    } catch {
      // ignore — they're at their limit anyway
    }
    return emptyTwiml();
  }

  let reply: string;
  let intentTag: string;
  try {
    const intent = await classifyIntent(body);
    intentTag = intent.type;
    switch (intent.type) {
      case "stop":
        // Twilio handles STOP at carrier level. Don't reply (would be a violation).
        return emptyTwiml();
      case "help":
        reply = helpReply();
        break;
      case "save_recipe":
        reply = await handleSaveRecipe(userId, intent.url);
        break;
      case "find_recipe":
        reply = await handleFindRecipe(userId, intent.query);
        break;
      case "chat":
        reply = await handleChat(userId, intent.message);
        break;
    }
  } catch (err) {
    console.error("[sms/receive] handler error:", err);
    reply = "Something went wrong on my end. Try again in a moment.";
    intentTag = "error";
  }

  try {
    const sent = await sendSms(from, reply);
    admin.from("sms_messages").insert({
      user_id: userId,
      direction: "outbound",
      from_number: params.To || "",
      to_number: from,
      body: reply,
      intent: intentTag,
      twilio_sid: sent?.sid || null,
    }).then(() => {}, () => {});
  } catch (err) {
    console.error("[sms/receive] outbound sendSms failed:", err);
  }

  return emptyTwiml();
}
