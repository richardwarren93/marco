import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT } from "jose";
import { createMarcoServer } from "../../src/lib/mcp/server.ts";
import { handleMcpRequest } from "../../src/lib/mcp/handler.ts";
import { verifyPluginToken } from "../../src/lib/mcp/auth.ts";
import { firstPartyFetch } from "../../src/lib/mcp/session-boundary.ts";
import { createPluginData, type PluginData } from "../../src/lib/mcp/data.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recipeInput } from "../../src/lib/mcp/recipe-input.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const config = { issuer: "https://auth.example.test/auth/v1", resource: "https://marco.example.test/api/mcp", clients: [clientId] };
const fixture: PluginData = {
  async saveRecipe(recipe) { return { saved: true, already_saved: false, recipe: { id: userId, title: recipe.title, url: "https://marco.example.test/recipes/one" } }; },
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

test("MCP initialization and seven accurately annotated tools", async () => {
  const init = await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  assert.equal(init.result.serverInfo.name, "marco");
  const { result } = await rpc("tools/list");
  assert.equal(result.tools.length, 7);
  for (const tool of result.tools) {
    assert.equal(tool.annotations.readOnlyHint, tool.name !== "save_recipe");
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
    for (const name of ["select", "eq", "ilike", "order", "range", "maybeSingle", "gte", "lte", "in", "limit", "insert", "single"]) {
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

const newRecipe = recipeInput.parse({ title: "Toast", ingredients: [{ name: "bread", amount: "1", unit: "slice" }], steps: ["Toast bread."] });

test("preview does not save, resource is available, and save requires explicit confirmation", async () => {
  let saves = 0;
  const data = { ...fixture, async saveRecipe(recipe: typeof newRecipe) { saves++; return fixture.saveRecipe(recipe); } };
  const preview = await rpc("tools/call", { name: "preview_recipe", arguments: { recipe: newRecipe } }, data);
  assert.equal(preview.result.structuredContent.recipe.title, "Toast");
  assert.equal(saves, 0);
  const resource = await rpc("resources/read", { uri: "ui://marco/recipe-card-v1.html" });
  assert.equal(resource.result.contents[0].mimeType, "text/html;profile=mcp-app");
  for (const args of [{ recipe: newRecipe }, { recipe: newRecipe, confirmed: false }, { recipe: { ...newRecipe, user_id: userId }, confirmed: true }, { recipe: { ...newRecipe, source_url: "javascript:alert(1)" }, confirmed: true }]) {
    const response = await rpc("tools/call", { name: "save_recipe", arguments: args }, data);
    assert.ok(response.error || response.result?.isError);
  }
  assert.equal(saves, 0);
  const saved = await rpc("tools/call", { name: "save_recipe", arguments: { recipe: newRecipe, confirmed: true } }, data);
  assert.equal(saved.result.structuredContent.saved, true);
  assert.equal(saves, 1);
});

test("recipe saving fails closed without permission and checks both user and client", async () => {
  for (const result of [{ data: null, error: null }, { data: { recipe_save_enabled: false }, error: null }, { data: null, error: { message: "secret diagnostic" } }]) {
    const { db, queries } = database([result]);
    await assert.rejects(() => createPluginData(db, userId, "https://marco.example.test", clientId).saveRecipe(newRecipe), /Nothing was saved/);
    assert.equal(queries.length, 1);
    assert.ok(queries[0].calls.some(c => c[0] === "eq" && c[1] === "user_id" && c[2] === userId));
    assert.ok(queries[0].calls.some(c => c[0] === "eq" && c[1] === "client_id" && c[2] === clientId));
  }
});

test("recipe insert uses authenticated owner and duplicate retries return the same record", async () => {
  const permitted = { data: { recipe_save_enabled: true }, error: null };
  const record = { data: { id: clientId, title: "Toast" }, error: null };
  const first = database([permitted, { data: null, error: null }, record]);
  const saved = await createPluginData(first.db, userId, "https://marco.example.test", clientId).saveRecipe(newRecipe);
  assert.equal(saved.already_saved, false);
  const inserted = first.queries[2].calls.find(c => c[0] === "insert")?.[1] as Record<string, unknown>;
  assert.equal(inserted.user_id, userId);
  assert.match(String(inserted.plugin_save_key), /^[a-f0-9]{64}$/);
  const retry = database([permitted, record]);
  assert.equal((await createPluginData(retry.db, userId, "https://marco.example.test", clientId).saveRecipe(newRecipe)).already_saved, true);
  assert.equal(retry.queries.length, 2);
  const race = database([permitted, { data: null, error: null }, { data: null, error: { code: "23505" } }, record]);
  assert.equal((await createPluginData(race.db, userId, "https://marco.example.test", clientId).saveRecipe(newRecipe)).already_saved, true);
  for (const query of [first.queries[1], retry.queries[1], race.queries[3]]) {
    assert.ok(query.calls.some(c => c[0] === "eq" && c[1] === "user_id" && c[2] === userId));
  }
});
