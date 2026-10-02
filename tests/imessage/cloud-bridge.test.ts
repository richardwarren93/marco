import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMessage } from "../../integrations/imessage/bridge.ts";
import { verify } from "../../src/lib/imessage/protocol.ts";

test("cloud bridge signs requests with the scoped credential without database credentials", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MARCO_IMESSAGE_BRIDGE_KEY;
  const originalAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.MARCO_IMESSAGE_BRIDGE_KEY = "isolated-test-bridge-key";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = async (_url, init) => {
    const headers = new Headers(init?.headers);
    const body = String(init?.body);
    assert.ok(verify("isolated-test-bridge-key", headers.get("x-marco-time")!, body, headers.get("x-marco-signature")!));
    assert.equal(body.includes("isolated-test-bridge-key"), false);
    return new Response(JSON.stringify({ reply: "Saved" }), { status: 200 });
  };
  try {
    assert.equal(await handleMessage("test", "sender", "https://example.com/recipe", { type: "group", id: "chat" }), "Saved");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MARCO_IMESSAGE_BRIDGE_KEY; else process.env.MARCO_IMESSAGE_BRIDGE_KEY = originalKey;
    if (originalAdmin === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalAdmin;
  }
});
