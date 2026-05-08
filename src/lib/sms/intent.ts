import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export type Intent =
  | { type: "save_recipe"; url: string }
  | { type: "find_recipe"; query: string }
  | { type: "chat"; message: string }
  | { type: "help" }
  | { type: "stop" };

const URL_RE = /\bhttps?:\/\/\S+/i;

// Fast non-AI prefilters so common cases never spend a Claude call.
function localClassify(message: string): Intent | null {
  const trimmed = message.trim();
  if (!trimmed) return { type: "help" };

  const upper = trimmed.toUpperCase();
  // Twilio handles STOP/UNSTOP at the carrier level for compliance, but we
  // still want to recognize them so the handler doesn't reply or rate-limit.
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(upper)) {
    return { type: "stop" };
  }
  if (["HELP", "INFO", "?"].includes(upper)) {
    return { type: "help" };
  }

  const urlMatch = trimmed.match(URL_RE);
  if (urlMatch) {
    return { type: "save_recipe", url: urlMatch[0] };
  }

  return null;
}

export async function classifyIntent(message: string): Promise<Intent> {
  const local = localClassify(message);
  if (local) return local;

  // Two cases left: "find me my chicken recipe" vs free-form cooking question.
  // Use Haiku to disambiguate.
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: `You classify SMS messages sent to a recipe app.
Return ONLY one of these JSON objects, nothing else:
- {"type":"find_recipe","query":"<the search query>"} — if the user is asking to retrieve, find, send, or pull up one of their saved recipes (e.g. "send me my chicken recipe", "what was that pasta dish I saved", "pull up my pad thai")
- {"type":"chat","message":"<the original message>"} — for any other cooking, food, or general question (e.g. "what can I make with chicken and rice", "how long do I cook salmon", "is butter ok at room temp")

No markdown. No explanation. Just the JSON object.`,
    messages: [{ role: "user", content: message }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.type === "find_recipe" && typeof parsed.query === "string") {
      return { type: "find_recipe", query: parsed.query };
    }
    if (parsed.type === "chat") {
      return { type: "chat", message };
    }
  } catch {
    // fall through to chat
  }
  return { type: "chat", message };
}
