import { test } from "node:test";
import assert from "node:assert/strict";
import { bridgeKey, sign, verify, recipeUrl, senderKey } from "../../src/lib/imessage/protocol.ts";
import { publicIPv4 } from "../../src/lib/imessage/fetch-recipe.ts";
import { structuredRecipe } from "../../src/lib/imessage/extract.ts";

test("bridge requests bind body and timestamp to a purpose-separated credential", () => {
  const key = bridgeKey("test-service-key"); const time = String(Date.now()); const body = '{"sender":"one"}';
  assert.notEqual(key, "test-service-key");
  const signature = sign(key, time, body);
  assert.ok(verify(key, time, body, signature));
  assert.equal(verify(key, time, '{"sender":"two"}', signature), false);
  assert.equal(verify(key, time, body, signature, Number(time) + 300001), false);
  assert.equal(verify(key, time, body, "abc"), false);
  assert.notEqual(senderKey("one"), senderKey("two"));
});
test("accept one HTTPS recipe URL without embedded credentials", () => {
  assert.equal(recipeUrl("save https://example.com/recipe#steps"), "https://example.com/recipe");
  assert.equal(recipeUrl("don't save https://example.com/recipe"), null);
  for (const value of ["http://example.com", "https://user:secret@example.com/", "https://example.com:8080", "https://one.com https://two.com"]) assert.equal(recipeUrl(value), null);
});
test("reject private, loopback, link-local, multicast, and carrier NAT addresses", () => {
  for (const ip of ["127.0.0.1", "0.0.0.0", "10.1.1.1", "169.254.169.254", "172.16.1.1", "192.168.1.2", "100.64.1.2", "224.0.0.1", "198.18.0.1", "999.1.1.1"]) assert.equal(publicIPv4(ip), false, ip);
  assert.ok(publicIPv4("93.184.216.34"));
});
test("extract explicit structured recipe ingredients and nested steps without AI", () => {
  const result = structuredRecipe([JSON.stringify({ "@graph": [{ "@type": "Recipe", name: "Pancakes", recipeIngredient: ["100g flour", "2 eggs"], recipeInstructions: [{ "@type": "HowToSection", itemListElement: [{ text: "Mix ingredients." }, { text: "Cook in a pan." }] }], recipeYield: "4 servings", prepTime: "PT10M", cookTime: "PT1H5M" }] })]);
  assert.equal(result?.title, "Pancakes"); assert.equal(result?.ingredients.length, 2); assert.equal(result?.steps.length, 2); assert.equal(result?.cook_time_minutes, 65);
  assert.equal(structuredRecipe(['{"@type":"Article","name":"Not a recipe"}']), null);
  assert.equal(structuredRecipe(['{"@type":"Recipe","name":"Missing instructions"}']), null);
});
