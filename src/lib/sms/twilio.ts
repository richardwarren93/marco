import crypto from "crypto";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export function smsConfigured(): boolean {
  return Boolean(ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER);
}

// Normalize a user-entered phone string to E.164. Accepts US-format inputs
// like "(555) 123-4567" or "5551234567" and assumes +1 if no country code.
// For other countries, the user should include "+<country>".
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    return "+" + digits;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

export async function sendSms(to: string, body: string): Promise<{ sid: string } | null> {
  if (!smsConfigured()) {
    console.warn("[sms] Twilio not configured — would send to", to, ":", body);
    return null;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
  const params = new URLSearchParams({
    From: FROM_NUMBER!,
    To: to,
    Body: body,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio send failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { sid: string };
  return { sid: data.sid };
}

// Validates an inbound webhook signature per
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
// Concatenate the full URL with sorted form params (key+value, no separator),
// HMAC-SHA1 with the auth token, base64. Compare with X-Twilio-Signature.
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  if (!AUTH_TOKEN || !signature) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];
  const expected = crypto
    .createHmac("sha1", AUTH_TOKEN)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// 6-digit numeric code, leading zeros allowed.
export function generateVerificationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}
