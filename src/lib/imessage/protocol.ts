import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const PROJECT_ID = "c3b111c1-1414-477e-bcf1-d09eeab35e70";
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
// Purpose-separated bridge credential. Never transmit the service-role key.
export function bridgeKey(serviceKey: string) {
  if (!serviceKey) throw new Error("Missing server configuration");
  return createHmac("sha256", serviceKey).update(`marco:imessage:bridge:v1:${PROJECT_ID}`).digest("hex");
}
export function sign(key: string, timestamp: string, body: string) {
  return createHmac("sha256", key).update(`${timestamp}.${body}`).digest("hex");
}
export function verify(key: string, timestamp: string, body: string, signature: string, now = Date.now()) {
  if (!/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 300_000 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(sign(key, timestamp, body), "hex"), Buffer.from(signature, "hex"));
}
export function senderKey(sender: string) { return hash(`${PROJECT_ID}:imessage:${sender}`); }
export function recipeUrl(text: string): string | null {
  const match = text.trim().match(/^(?:save(?: this(?: recipe)?)?\s+)?(https:\/\/[^\s<>]+)$/i);
  if (!match) return null;
  try {
    const url = new URL(match[1].replace(/[.,!?]+$/, ""));
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
