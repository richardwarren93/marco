// Marco catalog builder — populates the shared `catalog_recipes` table from
// multiple sources, enriched with the structured fields the decision engine
// scores on. Dedup is enforced by the DB (unique title_key + ON CONFLICT DO
// NOTHING), so every recipe counts exactly once no matter the source, and the
// script is safely re-runnable/resumable.
//
// Sources:
//   node scripts/build-catalog.mjs db                 # fold in existing recipes
//   node scripts/build-catalog.mjs spoonacular 400    # pull real recipes (free tier)
//   node scripts/build-catalog.mjs all 400
//
// Env required:
//   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY
//   SPOONACULAR_API_KEY   (for the spoonacular source; free tier at spoonacular.com/food-api)

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

// Load .env.local / .env (Next.js does this for the app; a plain node script
// doesn't). Existing process.env values win, so you can still override inline.
for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPOON_KEY = process.env.SPOONACULAR_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── Enrichment keyword maps (mirror discover/taste-profile inference) ─────────
const CUISINE_KW = {
  italian: ["pasta", "risotto", "pizza", "parmes", "marinara", "pesto", "italian", "lasagna", "gnocchi"],
  asian: ["soy", "ginger", "sesame", "teriyaki", "miso", "curry", "thai", "chinese", "japanese", "korean", "stir-fry", "stir fry", "ramen", "sushi", "hoisin", "sriracha", "gochujang"],
  mexican: ["taco", "burrito", "salsa", "tortilla", "enchilada", "guacamole", "quesadilla", "chipotle", "mexican", "cilantro"],
  mediterranean: ["hummus", "feta", "olive", "tahini", "falafel", "greek", "mediterranean", "tzatziki", "pita"],
  indian: ["masala", "tikka", "curry", "naan", "paneer", "tandoori", "indian", "garam", "dal", "biryani"],
  american: ["burger", "bbq", "mac and cheese", "meatloaf", "grits", "cornbread", "buffalo", "american"],
  french: ["ratatouille", "bourguignon", "béchamel", "bechamel", "french", "brie", "baguette", "coq au"],
};
const PROTEIN_KW = {
  chicken: ["chicken"], beef: ["beef", "steak", "ground beef"], pork: ["pork", "bacon", "sausage", "ham"],
  seafood: ["salmon", "shrimp", "tuna", "fish", "cod", "crab", "scallop", "prawn"],
  tofu: ["tofu", "tempeh"], beans: ["bean", "lentil", "chickpea", "black bean"], egg: ["egg"],
};
const MEAT = ["chicken", "beef", "pork", "bacon", "sausage", "ham", "lamb", "turkey", "steak", "veal"];
const SEAFOOD = ["salmon", "shrimp", "tuna", "fish", "cod", "crab", "scallop", "prawn", "anchovy"];
const DAIRY = ["milk", "cheese", "butter", "cream", "yogurt", "parmes", "mozzarella"];
const EGG = ["egg"];
const GLUTEN = ["flour", "bread", "pasta", "noodle", "soy sauce", "breadcrumb", "tortilla", "cracker", "wheat"];
const STAPLES = ["salt", "pepper", "water", "oil", "olive oil", "sugar", "garlic", "onion", "butter"];

const norm = (s) => String(s || "").trim().toLowerCase();
const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

function hit(text, kws) { return kws.some((k) => text.includes(k)); }

function inferCuisine(text) {
  let best = null, bestN = 0;
  for (const [cuisine, kws] of Object.entries(CUISINE_KW)) {
    const n = kws.filter((k) => text.includes(k)).length;
    if (n > bestN) { bestN = n; best = cuisine; }
  }
  return best; // may be null → engine treats as neutral
}
function inferProtein(ings) {
  const text = ings.join(" ");
  for (const [p, kws] of Object.entries(PROTEIN_KW)) if (hit(text, kws)) return p;
  return "none";
}
function inferDietary(ings) {
  const text = ings.join(" ");
  const flags = [];
  if (!hit(text, MEAT) && !hit(text, SEAFOOD)) flags.push("vegetarian");
  if (!hit(text, MEAT) && !hit(text, SEAFOOD) && !hit(text, DAIRY) && !hit(text, EGG)) flags.push("vegan");
  if (!hit(text, GLUTEN)) flags.push("gluten_free");
  if (!hit(text, DAIRY)) flags.push("dairy_free");
  return flags;
}
function inferDifficulty(totalMin, stepCount, ingCount) {
  let d = 2;
  if ((totalMin ?? 30) <= 20 && ingCount <= 7) d = 1;
  if ((totalMin ?? 30) >= 60 || stepCount >= 10 || ingCount >= 14) d = 4;
  if ((totalMin ?? 30) >= 120 || stepCount >= 15) d = 5;
  return d;
}
function keyIngredients(ings) {
  return [...new Set(ings.map(norm).filter((i) => i && !STAPLES.includes(i)))].slice(0, 6);
}
function mealTypeFrom(types = []) {
  const t = types.map(norm);
  if (t.some((x) => x.includes("breakfast") || x.includes("brunch"))) return "breakfast";
  if (t.some((x) => x.includes("snack") || x.includes("appetizer") || x.includes("fingerfood") || x.includes("dessert"))) return "snack";
  if (t.some((x) => x.includes("lunch"))) return "lunch";
  return "dinner";
}

// ── Dedup-safe insert ─────────────────────────────────────────────────────────
async function upsert(rows) {
  if (!rows.length) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error, count } = await sb
      .from("catalog_recipes")
      .upsert(batch, { onConflict: "title_key", ignoreDuplicates: true, count: "exact" });
    if (error) { console.error("upsert error:", error.message); continue; }
    inserted += count ?? 0;
  }
  return inserted;
}

// ── Source A: existing recipes in the DB ─────────────────────────────────────
async function importFromDb() {
  console.log("→ importing from existing recipes…");
  const { data, error } = await sb
    .from("recipes")
    .select("id,title,description,ingredients,steps,servings,prep_time_minutes,cook_time_minutes,tags,image_url,meal_type")
    .limit(5000);
  if (error) { console.error(error.message); return; }

  // Dedup by normalized title in-code (prefer rows that have steps + an image).
  const byTitle = new Map();
  for (const r of data) {
    const k = norm(r.title);
    if (!k) continue;
    const has = (byTitle.get(k)?.steps?.length ?? 0) > 0 && byTitle.get(k)?.image_url;
    const better = (r.steps?.length ?? 0) > 0 && r.image_url;
    if (!byTitle.has(k) || (!has && better)) byTitle.set(k, r);
  }

  const rows = [...byTitle.values()].map((r) => {
    const ings = (Array.isArray(r.ingredients) ? r.ingredients : []).map((i) =>
      typeof i === "string" ? i : i?.name || ""
    ).filter(Boolean);
    const ingObjs = (Array.isArray(r.ingredients) ? r.ingredients : []).map((i) =>
      typeof i === "string" ? { name: i, amount: "", unit: "" } : { name: i?.name || "", amount: String(i?.amount ?? ""), unit: i?.unit || "" }
    );
    const steps = (Array.isArray(r.steps) ? r.steps : []).map((s) => (typeof s === "string" ? s : s?.step || "")).filter(Boolean);
    const text = norm([r.title, r.description, (r.tags || []).join(" "), ings.join(" ")].join(" "));
    // Estimate a time when the recipe has none, so every card shows one.
    const rawTotal = (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0) || null;
    const total = rawTotal ?? Math.max(15, Math.min(90, Math.round((10 + steps.length * 4 + ings.length * 2) / 5) * 5));
    return {
      title: r.title,
      description: stripHtml(r.description),
      ingredients: ingObjs,
      steps,
      servings: r.servings,
      prep_time_minutes: r.prep_time_minutes,
      cook_time_minutes: r.cook_time_minutes,
      total_time_minutes: total,
      meal_type: r.meal_type || "dinner",
      cuisine: inferCuisine(text),
      difficulty: inferDifficulty(total, steps.length, ings.length),
      dietary_flags: inferDietary(ings),
      primary_protein: inferProtein(ings),
      key_ingredients: keyIngredients(ings),
      tags: r.tags || [],
      image_url: r.image_url,
      source: "user_recipe",
      external_id: `recipe:${r.id}`,
    };
  });
  const n = await upsert(rows);
  console.log(`  existing recipes: ${rows.length} unique titles → ${n} new catalog rows`);
}

// ── Source B: Spoonacular (real recipes, free tier) ──────────────────────────
const SPOON_CUISINES = ["Italian", "Asian", "Mexican", "Mediterranean", "Indian", "American", "French", "Thai", "Chinese", "Japanese", "Greek", "Korean"];
const SPOON_TYPES = ["main course", "breakfast", "salad", "soup"];

const PAGE = 20;          // results per request (Spoonacular max is 100, but 20 keeps point-cost low)
const MAX_OFFSET = 180;   // up to 10 pages per cuisine/type combo

async function importFromSpoonacular(target) {
  if (!SPOON_KEY) { console.error("Missing SPOONACULAR_API_KEY"); return; }
  console.log(`→ importing up to ${target} new recipes from Spoonacular…`);
  let total = 0;
  outer: for (const type of SPOON_TYPES) {
    for (const cuisine of SPOON_CUISINES) {
      if (total >= target) break outer;
      // Paginate through this combo so re-runs pull NEW recipes (page 2, 3, …)
      // rather than re-fetching the same top-20 (which just dedup away).
      for (let offset = 0; offset <= MAX_OFFSET; offset += PAGE) {
        if (total >= target) break outer;
        const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
        url.searchParams.set("apiKey", SPOON_KEY);
        url.searchParams.set("cuisine", cuisine);
        url.searchParams.set("type", type);
        url.searchParams.set("number", String(PAGE));
        url.searchParams.set("offset", String(offset));
        url.searchParams.set("addRecipeInformation", "true");
        url.searchParams.set("fillIngredients", "true");
        url.searchParams.set("instructionsRequired", "true");
        url.searchParams.set("sort", "popularity");
        const res = await fetch(url);
        if (res.status === 402) { console.error("  Spoonacular daily quota reached — stopping. Re-run tomorrow (resumes automatically)."); break outer; }
        if (!res.ok) { console.error(`  ${cuisine}/${type} @${offset}: HTTP ${res.status}`); break; }
        const json = await res.json();
        const results = json.results || [];
        if (results.length === 0) break; // no more pages for this combo
        const rows = results.map((r) => mapSpoon(r, cuisine)).filter(Boolean);
        const n = await upsert(rows);
        total += n;
        console.log(`  ${cuisine} / ${type} @${offset}: +${n} (total ${total})`);
        await new Promise((r) => setTimeout(r, 800)); // gentle throttle
        if (offset + PAGE >= (json.totalResults || 0)) break; // combo exhausted
      }
    }
  }
  console.log(`  Spoonacular: ${total} new catalog rows`);
}

function mapSpoon(r, cuisine) {
  if (!r?.title) return null;
  const ingObjs = (r.extendedIngredients || []).map((i) => ({
    name: i.nameClean || i.name || "",
    amount: String(i.measures?.us?.amount ?? i.amount ?? ""),
    unit: i.measures?.us?.unitShort || i.unit || "",
  }));
  const ings = ingObjs.map((i) => i.name).filter(Boolean);
  const steps = (r.analyzedInstructions?.[0]?.steps || []).map((s) => s.step).filter(Boolean);
  const total = r.readyInMinutes || null;
  const diet = [];
  if (r.vegetarian) diet.push("vegetarian");
  if (r.vegan) diet.push("vegan");
  if (r.glutenFree) diet.push("gluten_free");
  if (r.dairyFree) diet.push("dairy_free");
  return {
    title: r.title,
    description: stripHtml(r.summary).slice(0, 400),
    ingredients: ingObjs,
    steps,
    servings: r.servings,
    prep_time_minutes: null,
    cook_time_minutes: null,
    total_time_minutes: total,
    meal_type: mealTypeFrom(r.dishTypes),
    cuisine: norm(r.cuisines?.[0] || cuisine) || inferCuisine(norm(r.title)),
    difficulty: inferDifficulty(total, steps.length, ings.length),
    dietary_flags: diet,
    primary_protein: inferProtein(ings),
    key_ingredients: keyIngredients(ings),
    tags: [...(r.dishTypes || []), ...(r.cuisines || [])].map(norm),
    image_url: r.image || null,
    source: "spoonacular",
    external_id: `spoonacular:${r.id}`,
    source_url: r.sourceUrl || r.spoonacularSourceUrl || null,
  };
}

// ── Entry ────────────────────────────────────────────────────────────────────
const [mode, arg] = process.argv.slice(2);
const target = parseInt(arg || "400", 10);
(async () => {
  if (mode === "db" || mode === "all") await importFromDb();
  if (mode === "spoonacular" || mode === "all") await importFromSpoonacular(target);
  if (!["db", "spoonacular", "all"].includes(mode)) {
    console.log("usage: node scripts/build-catalog.mjs <db|spoonacular|all> [count]");
  }
  const { count } = await sb.from("catalog_recipes").select("id", { count: "exact", head: true });
  console.log(`\n✓ catalog_recipes now holds ${count ?? "?"} recipes.`);
})();
