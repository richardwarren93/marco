// Cloud entry point. Run exactly one active worker per Photon project.
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { handleMessage } from "../bridge.ts";
// Deployment can be verified before cutting over from the local consumer.
if (process.env.MARCO_WORKER_ENABLED !== "true") {
  console.info("[marco] Cloud worker staged; enable only after stopping the local worker");
  await new Promise<void>(() => { setInterval(() => {}, 60_000); });
}
for (const name of ["PROJECT_ID", "PROJECT_SECRET", "MARCO_IMESSAGE_BRIDGE_KEY"]) {
  if (!process.env[name]) throw new Error(`Missing required configuration: ${name}`);
}
// Spectrum bridges a single agent loop to many messaging interfaces.
// Each provider in `providers` adds an interface (terminal TUI, iMessage, …).
// Docs: https://photon.codes/docs/spectrum-ts
const app = await Spectrum({
  projectId: process.env.PROJECT_ID!,
  projectSecret: process.env.PROJECT_SECRET!,
  providers: [
    // imessage
    imessage.config(),
  ],
});

// `app.messages` is an async iterable. Each tick yields a `space` (the
// conversation) and an inbound `message`. Reply by awaiting `space.send(...)`.
for await (const [space, message] of app.messages) {
  console.info("[marco] Incoming event", { direction: message.direction, chatType: "type" in space ? space.type : "unknown", contentType: message.content.type, hasSender: Boolean(message.sender?.id) });
  if (message.direction !== "inbound" || !message.sender?.id || !("type" in space) || (space.type !== "dm" && space.type !== "group")) continue;
  const text = message.content.type === "text" ? message.content.text : message.content.type === "richlink" ? message.content.url : null;
  const reaction = message.content.type === "reaction" && ["❤️", "❤"].includes(message.content.emoji) && space.type === "group"
    ? { emoji: message.content.emoji, targetId: message.content.target.id } : undefined;
  if (!text && !reaction) continue;
  try {
    const reply = await handleMessage(message.id, message.sender.id, text || "", { type: space.type, id: space.id }, reaction);
    if (reply) await space.send(reply);
    console.info("[marco] Message processed", { replied: Boolean(reply) });
  } catch {
    console.error("[marco] Message processing failed; no message contents logged");
    try { await space.send("Marco is temporarily unavailable. Please try again in a moment."); } catch { /* Keep receiving if delivery fails. */ }
  }
}
