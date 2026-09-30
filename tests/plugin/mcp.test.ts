import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT } from "jose";
import { createMarcoServer } from "../../src/lib/mcp/server.ts";
import { handleMcpRequest } from "../../src/lib/mcp/handler.ts";
import { verifyPluginToken } from "../../src/lib/mcp/auth.ts";
import { firstPartyFetch } from "../../src/lib/mcp/session-boundary.ts";
import { createPluginData, type PluginData } from "../../src/lib/mcp/data.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

const userId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const config = { issuer: "https://auth.example.test/auth/v1", resource: "https://marco.example.test/api/mcp", clients: [clientId] };
const fixture: PluginData = {
  async searchRecipes(query) { return { recipes: [{ title: query, id: userId, url: "https://marco.example.test/recipes/one", description: null, servings: 2, prep_time_minutes: 1, cook_time_minutes: 2, tags: [] }], next_offset: null }; },
  async getRecipe() { throw new Error("private database diagnostic"); },
  async getMealPlan(start, end) { return { start_date: start, end_date: end, meals: [], truncated: false, url: "https://marco.example.test/meal-plan" }; },
  async getPantry() { return { items: [], next_offset: null }; },
  async getGroceryList() { return { exists: false, items: [], message: "No saved list" }; },
};
async function rpc(method: string, params: object = {}, data = fixture) {
  const response = await handleMcpRequest(new Request(config.resource, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }), createMarcoServer(data));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  return response.json();
}

test("MCP initialization and five accurately annotated tools", async () => {
  const init = await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  assert.equal(init.result.serverInfo.name, "marco");
  const { result } = await rpc("tools/list");
  assert.equal(result.tools.length, 5);
  for (const tool of result.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.ok(!JSON.stringify(tool.inputSchema).includes("user_id"));
  }
});

test("tool success, pagination bounds, unknown inputs, date validation, and sanitized errors", async () => {
  const good = await rpc("tools/call", { name: "search_recipes", arguments: { query: "pasta" } });
  assert.equal(good.result.structuredContent.recipes[0].title, "pasta");
  for (const args of [{ limit: 1000 }, { user_id: userId }, { offset: -1 }]) {
    const invalid = await rpc("tools/call", { name: "search_recipes", arguments: args });
    assert.ok(invalid.error || invalid.result?.isError);
  }
  for (const args of [
    { start_date: "2026-02-30", end_date: "2026-03-01" },
    { start_date: "2026-10-10", end_date: "2026-10-01" },
    { start_date: "2026-01-01", end_date: "2026-12-31" },
  ]) {
    const invalid = await rpc("tools/call", { name: "get_meal_plan", arguments: args });
    assert.ok(invalid.error || invalid.result?.isError);
  }
  const failed = await rpc("tools/call", { name: "get_recipe", arguments: { recipe_id: userId } });
  assert.equal(failed.result.isError, true);
  assert.ok(!JSON.stringify(failed).includes("diagnostic"));
});

test("JWT signature, resource audience, issuer, expiry, client, and access restrictions", async () => {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const key = async () => publicKey;
  const sign = (overrides: Record<string, unknown> = {}) => new SignJWT({
    sub: userId, client_id: clientId, marco_access: "read", iss: config.issuer, aud: config.resource,
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, ...overrides,
  }).setProtectedHeader({ alg: "ES256" }).sign(privateKey);
  assert.equal((await verifyPluginToken(await sign(), config, key)).userId, userId);
  for (const overrides of [{ aud: "authenticated" }, { iss: "https://evil.test" }, { client_id: "other" }, { exp: 1 }, { marco_access: "write" }, { sub: "not-a-user-id" }]) {
    await assert.rejects(() => sign(overrides).then(token => verifyPluginToken(token, config, key)));
  }
  const other = await generateKeyPair("ES256");
  await assert.rejects(() => sign().then(token => verifyPluginToken(token, config, async () => other.publicKey)));
  const pluginToken = await sign();
  const response = await firstPartyFetch("https://must-not-be-called.test", { headers: { Authorization: `Bearer ${pluginToken}` } });
  assert.equal(response.status, 401);
  const browserToken = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: "ES256" }).sign(privateKey);
  const browser = await firstPartyFetch("data:text/plain,browser-session-ok", { headers: { Authorization: `Bearer ${browserToken}` } });
  assert.equal(await browser.text(), "browser-session-ok");
});

// A minimal recording query client verifies authorization filters and response
// transformations without production credentials or private customer data.
function database(results: Array<{ data: unknown; error: unknown }>) {
  const queries: Array<{ table: string; calls: Array<[string, ...unknown[]]> }> = [];
  return { queries, db: { from(table: string) {
    const query = { table, calls: [] as Array<[string, ...unknown[]]> }; queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const name of ["select", "eq", "ilike", "order", "range", "maybeSingle", "gte", "lte", "in", "limit"]) {
      builder[name] = (...args: unknown[]) => { query.calls.push([name, ...args]); return builder; };
    }
    builder.then = (resolve: (value: unknown) => void) => resolve(results.shift());
    return builder;
  } } as unknown as SupabaseClient };
}

test("recipe access is owner-scoped; missing recipe never leaks another user's data", async () => {
  const { db, queries } = database([{ data: null, error: null }]);
  await assert.rejects(() => createPluginData(db, userId, "https://marco.example.test").getRecipe(clientId), /not found/);
  assert.ok(queries[0].calls.some(c => c[0] === "eq" && c[1] === "user_id" && c[2] === userId));
});

test("shared grocery list resolves membership and respects edits/deletions", async () => {
  const { db, queries } = database([
    { data: { household_id: "house" }, error: null },
    { data: { created_by: "owner" }, error: null },
    { data: { id: "list", date_end: "2026-10-06" }, error: null },
    { data: [{ name: "milk", name_override: "oat milk", amount: "1", amount_override: "2", unit: "carton", checked: true, in_pantry: false }], error: null },
  ]);
  const list = await createPluginData(db, userId, "https://marco.example.test").getGroceryList("2026-09-30");
  assert.equal(list.items[0].name, "oat milk");
  assert.equal(list.items[0].amount, "2");
  assert.ok(queries[0].calls.some(c => c[0] === "eq" && c[1] === "user_id" && c[2] === userId));
  assert.ok(queries[2].calls.some(c => c[0] === "eq" && c[1] === "user_id" && c[2] === "owner"));
  assert.ok(queries[3].calls.some(c => c[0] === "eq" && c[1] === "list_id" && c[2] === "list"));
  assert.ok(queries[3].calls.some(c => c[0] === "eq" && c[1] === "soft_deleted" && c[2] === false));
});

test("membership errors stop grocery access instead of falling back", async () => {
  const { db, queries } = database([{ data: null, error: { message: "database failure" } }]);
  await assert.rejects(() => createPluginData(db, userId, "https://marco.example.test").getGroceryList("2026-09-30"), /could not be checked/);
  assert.equal(queries.length, 1);
});
