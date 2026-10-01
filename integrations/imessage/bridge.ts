import { PROJECT_ID, bridgeKey, sign } from "../../src/lib/imessage/protocol.ts";

export async function handleMessage(id: string, sender: string, text: string, chat: { type: "dm" | "group"; id: string }, reaction?: { emoji: string; targetId: string }): Promise<string | null> {
  const key = bridgeKey(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  const body = JSON.stringify({ project: PROJECT_ID, id, sender, text, chat, ...(reaction ? { reaction } : {}) });
  const timestamp = String(Date.now());
  const response = await fetch("https://marco-eta-lyart.vercel.app/api/imessage/message", {
    method: "POST", headers: { "Content-Type": "application/json", "x-marco-time": timestamp, "x-marco-signature": sign(key, timestamp, body) },
    body, signal: AbortSignal.timeout(125_000),
  });
  if (!response.ok) throw new Error(`Marco bridge status ${response.status}`);
  const data = await response.json() as { reply?: string | null };
  return data.reply ?? null;
}
