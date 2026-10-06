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
  if (!match?.[1]) return null;
  try {
    const url = new URL(match[1].replace(/[.,!?]+$/, ""));
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

// ── Group-chat binding ───────────────────────────────────────────────────────
// Starting a Household / Family / Friends chat in the app mints a signed,
// expiring token that rides inside the invite URL of the seed message. When
// that message shows up in a GROUP chat, the server binds the group: a
// household chat becomes a shared kitchen, a family/friends chat becomes a
// Table. Stateless (HMAC, no token table). Seeing the token proves the chat was
// started from the app by user `u` — never infer a binding from who's present.
export type BindGroup = "household" | "family" | "friends" | "table";
export type BindClaim = { k: "household" | "table"; id: string; u: string; g: BindGroup; e: number };
const BIND_TTL_MS = 3 * 24 * 60 * 60 * 1000;
function bindKey(serviceKey: string) {
  if (!serviceKey) throw new Error("Missing server configuration");
  return createHmac("sha256", serviceKey).update(`marco:imessage:bind:v1:${PROJECT_ID}`).digest();
}
export function signBind(serviceKey: string, claim: Omit<BindClaim, "e">, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...claim, e: now + BIND_TTL_MS }), "utf8").toString("base64url");
  const sig = createHmac("sha256", bindKey(serviceKey)).update(payload).digest("base64url").slice(0, 32);
  return `${payload}.${sig}`;
}
export function verifyBind(serviceKey: string, token: string, now = Date.now()): BindClaim | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sig.length !== 32) return null;
  const want = createHmac("sha256", bindKey(serviceKey)).update(payload).digest("base64url").slice(0, 32);
  if (!timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as BindClaim;
    if ((c.k !== "household" && c.k !== "table") || typeof c.id !== "string" || typeof c.u !== "string" || typeof c.e !== "number" || c.e < now) return null;
    if (!["household", "family", "friends", "table"].includes(c.g)) return null;
    return c;
  } catch { return null; }
}
// Finds a bind token anywhere in a message (seed text + URL, or a bare URL
// forwarded from a rich link). The token is the `m` query parameter.
export function findBindToken(text: string): string | null {
  const m = text.match(/[?&]m=([A-Za-z0-9_-]{20,800}\.[A-Za-z0-9_-]{32})(?![A-Za-z0-9_-])/);
  return m?.[1] ?? null;
}
