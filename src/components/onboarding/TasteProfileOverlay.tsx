"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TASTE_DIMENSIONS } from "./data/taste-dimensions";
import type { RankingRecipe } from "./data/ranking-recipes";

interface TasteScores {
  sweet: number;
  savory: number;
  richness: number;
  tangy: number;
}

interface Props {
  rankedIds: string[];
  rankedRecipes: RankingRecipe[];
  signatureDish: string;
  onComplete: (tasteScores?: TasteScores, cuisinePreferences?: string[]) => void;
}

const CUISINE_FLAGS: Record<string, string> = {
  italian: "\u{1F1EE}\u{1F1F9}", thai: "\u{1F1F9}\u{1F1ED}", japanese: "\u{1F1EF}\u{1F1F5}",
  mexican: "\u{1F1F2}\u{1F1FD}", mediterranean: "\u{1F1EC}\u{1F1F7}", american: "\u{1F1FA}\u{1F1F8}",
  fusion: "\u{1F30D}", chinese: "\u{1F1E8}\u{1F1F3}", latin: "\u{1F1F5}\u{1F1EA}",
  asian: "\u{1F30F}",
};

const CUISINE_LABELS: Record<string, string> = {
  asian: "Asian", latin: "Latin", mediterranean: "Mediterranean",
  italian: "Italian", american: "American", chinese: "Chinese",
  japanese: "Japanese", thai: "Thai", mexican: "Mexican", fusion: "Fusion",
};

const FLAVOR_DIMENSIONS = [
  { key: "sweet" as const, label: "Sweet", color: "#ea580c" },
  { key: "savory" as const, label: "Savory", color: "#d97706" },
  { key: "tangy" as const, label: "Tangy", color: "#c2410c" },
  { key: "richness" as const, label: "Richness", color: "#b45309" },
];

function computeFlavorScores(rankedRecipes: RankingRecipe[]) {
  const scores = { sweet: 0, savory: 0, richness: 0, tangy: 0 };
  rankedRecipes.forEach((recipe, idx) => {
    const weight = rankedRecipes.length - idx; // higher rank = more weight
    if (!recipe.flavorWeights) return;
    scores.sweet += recipe.flavorWeights.sweet * weight;
    scores.savory += recipe.flavorWeights.savory * weight;
    scores.richness += recipe.flavorWeights.richness * weight;
    scores.tangy += recipe.flavorWeights.tangy * weight;
  });
  // Normalize to 0–100
  const max = Math.max(scores.sweet, scores.savory, scores.richness, scores.tangy, 1);
  return {
    sweet: Math.round((scores.sweet / max) * 100),
    savory: Math.round((scores.savory / max) * 100),
    richness: Math.round((scores.richness / max) * 100),
    tangy: Math.round((scores.tangy / max) * 100),
  };
}

function computeCuisineScores(rankedRecipes: RankingRecipe[]) {
  const scores: Record<string, number> = {};
  rankedRecipes.forEach((recipe, idx) => {
    const weight = rankedRecipes.length - idx;
    const c = recipe.cuisine;
    if (c) scores[c] = (scores[c] || 0) + weight;
  });
  return Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => ({
      id,
      label: CUISINE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
      flag: CUISINE_FLAGS[id] || "\u{1F30D}",
    }));
}

const STYLE_EMOJIS: Record<string, string> = {
  quick_meals: "\u{23F1}\uFE0F", one_pan: "\u{1F373}", baked: "\u{1F36A}", grilled: "\u{1F525}",
};

function inferProfile(rankedRecipes: RankingRecipe[]) {
  const scores: Record<string, Record<string, number>> = {};
  for (const dim of TASTE_DIMENSIONS) {
    scores[dim.key] = {};
    for (const v of dim.values) scores[dim.key][v.id] = 0;
  }
  rankedRecipes.forEach((recipe, idx) => {
    const weight = rankedRecipes.length - idx;
    const tags = recipe.tasteTags || {};
    if (!tags.flavor && !tags.texture) return;
    if (tags.flavor) tags.flavor.forEach((f) => { if (scores.flavor?.[f] !== undefined) scores.flavor[f] += weight; });
    if (tags.texture) tags.texture.forEach((t) => { if (scores.texture?.[t] !== undefined) scores.texture[t] += weight; });
    if (tags.cuisine) tags.cuisine.forEach((c) => { if (scores.cuisine?.[c] !== undefined) scores.cuisine[c] += weight; });
    if (tags.nutritional) tags.nutritional.forEach((n) => { if (scores.nutritional?.[n] !== undefined) scores.nutritional[n] += weight; });
    if (tags.cookingStyle) tags.cookingStyle.forEach((s) => { if (scores.cookingStyle?.[s] !== undefined) scores.cookingStyle[s] += weight; });
    if (tags.ingredients) tags.ingredients.forEach((i) => { if (scores.ingredients?.[i] !== undefined) scores.ingredients[i] += weight; });
  });
  return scores;
}

function getTopTraits(scores: Record<string, Record<string, number>>) {
  const traits: { label: string; score: number; dimKey: string }[] = [];
  for (const dim of TASTE_DIMENSIONS) {
    const sorted = Object.entries(scores[dim.key]).filter(([, s]) => s > 0).sort(([, a], [, b]) => b - a).slice(0, 2);
    for (const [traitId, score] of sorted) {
      const val = dim.values.find((v) => v.id === traitId);
      if (val) traits.push({ label: val.label, score, dimKey: dim.key });
    }
  }
  return traits.sort((a, b) => b.score - a.score);
}

interface ChefMatch {
  name: string;
  description: string;
}

const CHEF_MATCHES: { keywords: string[]; chef: ChefMatch }[] = [
  { keywords: ["spicy", "umami", "chinese", "garlic_heavy"], chef: { name: "David Chang", description: "Bold, boundary-pushing flavors with deep umami and fearless spice \u{2014} you cook like the Momofuku mastermind." } },
  { keywords: ["smoky", "grilled", "american", "high_protein"], chef: { name: "Aaron Franklin", description: "Low and slow with smoke-kissed perfection \u{2014} you share a soul with the king of Texas BBQ." } },
  { keywords: ["umami", "creamy", "italian", "cheese_forward"], chef: { name: "Ina Garten", description: "Rich, comforting, and effortlessly elegant \u{2014} your taste mirrors the Barefoot Contessa herself." } },
  { keywords: ["tangy", "herbaceous", "mediterranean", "quick_meals"], chef: { name: "Yotam Ottolenghi", description: "Fresh, vibrant, and layered with herbs \u{2014} your palate echoes the master of modern Mediterranean." } },
  { keywords: ["sweet", "crunchy", "baked", "indulgent"], chef: { name: "Samin Nosrat", description: "Salt, fat, acid, heat \u{2014} you instinctively balance flavors like the author who taught a generation to cook." } },
  { keywords: ["umami", "one_pan", "quick_meals", "garlic_heavy"], chef: { name: "Kenji L\u{00F3}pez-Alt", description: "Science-driven, flavor-maximizing, and no-fuss \u{2014} you cook like the Food Lab genius." } },
  { keywords: ["spicy", "fusion", "crunchy"], chef: { name: "Roy Choi", description: "Street food energy with global flavors \u{2014} your taste runs on the same fuel as the Kogi truck pioneer." } },
  { keywords: ["tangy", "low_carb", "fresh"], chef: { name: "Alice Waters", description: "Farm-fresh, seasonal, and beautifully simple \u{2014} you channel the mother of California cuisine." } },
];

function matchChef(topTraits: ReturnType<typeof getTopTraits>): ChefMatch {
  const traitLabels = new Set(topTraits.map((t) => t.label.toLowerCase().replace(/ /g, "_")));
  // Also include dimKey-specific trait ids
  const allKeys = new Set([...traitLabels]);
  topTraits.forEach((t) => allKeys.add(t.dimKey));

  let bestMatch = CHEF_MATCHES[0].chef;
  let bestScore = 0;

  for (const entry of CHEF_MATCHES) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (allKeys.has(kw)) score++;
      // Also fuzzy match against trait labels
      for (const label of traitLabels) {
        if (label.includes(kw) || kw.includes(label)) score += 0.5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry.chef;
    }
  }
  return bestMatch;
}

function generateInsights(topTraits: ReturnType<typeof getTopTraits>): { emoji: string; text: string }[] {
  const items: { emoji: string; text: string }[] = [];
  const flavors = topTraits.filter((t) => t.dimKey === "flavor").slice(0, 2);
  if (flavors.length > 0) items.push({ emoji: "\u{1F525}", text: `Crave ${flavors.map((f) => f.label.toLowerCase()).join(", ")} flavors` });
  const textures = topTraits.filter((t) => t.dimKey === "texture").slice(0, 1);
  if (textures.length > 0) items.push({ emoji: "\u{2728}", text: `Love ${textures[0].label.toLowerCase()} textures` });
  const styles = topTraits.filter((t) => t.dimKey === "cookingStyle").slice(0, 1);
  if (styles.length > 0) items.push({ emoji: "\u{23F1}\uFE0F", text: `Lean toward ${styles[0].label.toLowerCase()} cooking` });
  const ingr = topTraits.filter((t) => t.dimKey === "ingredients").slice(0, 1);
  if (ingr.length > 0) items.push({ emoji: "\u{2764}\uFE0F", text: `${ingr[0].label} vibes` });
  return items.slice(0, 4);
}

export default function TasteProfileOverlay({ rankedRecipes, signatureDish, onComplete }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "profile" | "import">("loading");
  const [showShare, setShowShare] = useState(false);
  const scores = useMemo(() => inferProfile(rankedRecipes), [rankedRecipes]);
  const topTraits = useMemo(() => getTopTraits(scores), [scores]);
  const chefMatch = useMemo(() => matchChef(topTraits), [topTraits]);
  const insights = useMemo(() => generateInsights(topTraits), [topTraits]);

  // New 4-dimension flavor scores
  const flavorScores = useMemo(() => computeFlavorScores(rankedRecipes), [rankedRecipes]);

  // Cuisine preferences from recipe.cuisine field
  const topCuisines = useMemo(() => computeCuisineScores(rankedRecipes), [rankedRecipes]);

  const topStyles = useMemo(() => {
    return Object.entries(scores.cookingStyle || {}).filter(([, s]) => s > 0).sort(([, a], [, b]) => b - a).slice(0, 4)
      .map(([id]) => ({
        id, label: TASTE_DIMENSIONS.find((d) => d.key === "cookingStyle")?.values.find((v) => v.id === id)?.label || id,
        emoji: STYLE_EMOJIS[id] || "\u{1F374}",
      }));
  }, [scores]);

  useEffect(() => {
    const t = setTimeout(() => setPhase("profile"), 2800);
    return () => clearTimeout(t);
  }, []);

  // ─── Loading ───
  if (phase === "loading") {
    return (
      <div className="max-w-2xl mx-auto w-full flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-5 px-8 max-w-sm">
          <span className="text-6xl block animate-pulse-soft">{"\u{1F9D1}\u{200D}\u{1F373}"}</span>
          <h2 className="text-xl font-black" style={{ color: "#1a1410" }}>Generating your taste profile...</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#a09890" }}>
            The more recipes you save and meals you plan, the more accurate your taste profile becomes
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: "#ea580c", animation: `pulse-soft 1.2s ease-in-out ${i * 0.25}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Import modal ───
  if (phase === "import") {
    return (
      <div className="max-w-2xl mx-auto w-full flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
          <span className="text-6xl block mb-4">{"\u{1F389}"}</span>
          <h2 className="text-2xl font-black mb-2" style={{ color: "#1a1410" }}>You&apos;re all set!</h2>
          <p className="text-sm mb-6" style={{ color: "#a09890" }}>Import your first recipe to get started</p>
          <button
            onClick={() => { onComplete(flavorScores, topCuisines.map((c) => c.id)); router.replace("/recipes"); setTimeout(() => { window.dispatchEvent(new CustomEvent("openFabImport")); }, 800); }}
            className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] mb-3"
            style={{ background: "#ea580c" }}
          >
            Import my first recipe
          </button>
          <button onClick={() => { onComplete(flavorScores, topCuisines.map((c) => c.id)); router.replace("/recipes"); }} className="w-full py-3 text-sm font-semibold" style={{ color: "#a09890" }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ─── Taste Profile ───
  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col">
      <div className="flex-1">
        {/* Header */}
        <div className="pt-6 pb-2 px-6 text-center">
          <h1 className="text-[32px] font-black leading-none" style={{ color: "#1a1410" }}>Taste DNA</h1>
        </div>

        {/* Your Taste Look-A-Like */}
        <div className="mx-5 mt-5 rounded-2xl p-5 animate-stagger-in" style={{ background: "white", border: "1px solid #eae7e2" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#ea580c" }}>Your Taste Look-A-Like</p>
          <p className="text-lg font-black mb-1" style={{ color: "#1a1410" }}>{chefMatch.name}</p>
          <p className="text-sm leading-relaxed" style={{ color: "#555" }}>{chefMatch.description}</p>
        </div>

        {/* Top Cuisines */}
        {topCuisines.length > 0 && (
          <div className="mx-5 mt-3 rounded-2xl p-5 animate-stagger-in" style={{ animationDelay: "0.08s", background: "white", border: "1px solid #eae7e2" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#ea580c" }}>Top Cuisines</p>
            <div className="flex gap-2 flex-wrap">
              {topCuisines.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full" style={{ background: "#f3f2ef" }}>
                  <span className="text-sm">{c.flag}</span>
                  <span className="text-xs font-semibold" style={{ color: "#1a1410" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* You Tend To + Flavor Profile */}
        <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
          {/* You tend to */}
          <div className="rounded-2xl p-4 animate-stagger-in" style={{ animationDelay: "0.15s", background: "white", border: "1px solid #eae7e2" }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#ea580c" }}>You tend to...</p>
            <div className="space-y-2.5">
              {insights.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-xs flex-shrink-0">{item.emoji}</span>
                  <span className="text-[11px] leading-tight" style={{ color: "#555" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flavor profile — 4 unified dimensions */}
          <div className="rounded-2xl p-4 animate-stagger-in" style={{ animationDelay: "0.2s", background: "white", border: "1px solid #eae7e2" }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#ea580c" }}>Flavor Profile</p>
            <div className="space-y-2.5">
              {FLAVOR_DIMENSIONS.map((dim) => (
                <div key={dim.key}>
                  <span className="text-[10px] font-medium" style={{ color: "#1a1410" }}>{dim.label}</span>
                  <div className="h-2 rounded-full overflow-hidden mt-0.5" style={{ background: "#efede8" }}>
                    <div className="h-full rounded-full animate-bar-fill" style={{ width: `${Math.max(flavorScores[dim.key], 8)}%`, background: dim.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cooking Style */}
        {topStyles.length > 0 && (
          <div className="mx-5 mt-3 rounded-2xl p-5 animate-stagger-in" style={{ animationDelay: "0.28s", background: "white", border: "1px solid #eae7e2" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#ea580c" }}>Cooking Style</p>
            <div className="flex gap-2 flex-wrap">
              {topStyles.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full" style={{ background: "#f3f2ef" }}>
                  <span className="text-xs">{s.emoji}</span>
                  <span className="text-xs font-medium" style={{ color: "#1a1410" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Dish */}
        {signatureDish && (
          <div className="mx-5 mt-3 rounded-2xl p-5 animate-stagger-in" style={{ animationDelay: "0.35s", background: "white", border: "1px solid #eae7e2" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#ea580c" }}>Signature Dish</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{"\u{1F451}"}</span>
              <p className="text-base font-bold" style={{ color: "#1a1410" }}>{signatureDish}</p>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] pb-4" style={{ color: "#c4b8af" }}>
          Save more recipes to unlock deeper insights
        </p>
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 pt-3 space-y-3">
        <button
          onClick={async () => {
            const text = `My Marco Taste DNA look-a-like is ${chefMatch.name}! Top flavors: ${topTraits.slice(0, 3).map((t) => t.label).join(", ")} \u{1F525}`;
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
              try { await navigator.share({ title: "My Taste DNA", text }); } catch { /* cancelled */ }
            } else if (typeof navigator !== "undefined") {
              await navigator.clipboard.writeText(text);
            }
          }}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
          style={{ background: "#1a1410", color: "white" }}
        >
          🔗 Share my Taste DNA
        </button>
        <button onClick={() => setPhase("import")} className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]" style={{ background: "#ea580c" }}>
          Continue
        </button>
      </div>

      {/* Share sheet */}
      {showShare && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowShare(false)} />
          <div className="relative w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 space-y-4 animate-slide-up bg-white">
            <div className="w-10 h-1 rounded-full mx-auto sm:hidden" style={{ background: "#eae7e2" }} />
            <h3 className="text-lg font-bold text-center" style={{ color: "#1a1410" }}>Share Your Taste DNA</h3>
            <div className="p-4 rounded-xl" style={{ background: "#f8f7f5" }}>
              <p className="text-sm font-bold text-center mb-1" style={{ color: "#1a1410" }}>Taste Look-A-Like: {chefMatch.name}</p>
              <p className="text-xs text-center leading-relaxed" style={{ color: "#555" }}>{chefMatch.description}</p>
            </div>
            <button
              onClick={async () => {
                const text = `My Marco Taste DNA look-a-like is ${chefMatch.name}! Top flavors: ${topTraits.slice(0, 3).map((t) => t.label).join(", ")} \u{1F525}`;
                if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                  try { await navigator.share({ title: "My Taste DNA", text }); } catch { /* cancelled */ }
                } else if (typeof navigator !== "undefined") { await navigator.clipboard.writeText(text); }
                setShowShare(false);
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white" style={{ background: "#ea580c" }}
            >
              {typeof navigator !== "undefined" && typeof navigator.share === "function" ? "Share" : "Copy to clipboard"}
            </button>
            <button onClick={() => setShowShare(false)} className="w-full py-2 text-sm font-semibold" style={{ color: "#a09890" }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
