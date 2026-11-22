import { test } from "node:test";
import assert from "node:assert/strict";
import { recipeCardLayout } from "../../src/lib/imessage/recipe-card.ts";

test("card distinguishes total time from a partially known cooking time", () => {
  const recipe = { title: "Lemon chicken", sourceUrl: "https://example.com/recipe", cookMinutes: 30 };
  assert.equal(recipeCardLayout(recipe, true).trailingCaption, "30 min cooking");
  assert.equal(recipeCardLayout({ ...recipe, prepMinutes: 10 }, true).trailingCaption, "40 min total");
  assert.equal(recipeCardLayout({ ...recipe, cookMinutes: null }, true).trailingCaption, undefined);
});

test("card points hearts to the original link and pairs image bytes with title", () => {
  const recipe = { title: "Lemon chicken", sourceUrl: "https://example.com/recipe" };
  const group = recipeCardLayout(recipe, true);
  assert.match(group.subcaption, /original recipe link/);
  assert.equal("imageTitle" in group, false);
  assert.doesNotMatch(recipeCardLayout(recipe, false).subcaption, /Heart/);
  const image = new Uint8Array([255, 216, 255]);
  const pictured = recipeCardLayout({ ...recipe, imageJpeg: image }, true);
  assert.equal(pictured.image, image);
  assert.equal(pictured.imageTitle, recipe.title);
});
