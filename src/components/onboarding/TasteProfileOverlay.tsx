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
  allergies: string[];
  onBack?: () => void;
  onComplete: (tasteScores?: TasteScores, cuisinePreferences?: string[]) => void;
  /** When provided (paywall enabled), finishing saves the profile and hands
   *  off to the Plus upsell instead of navigating straight to /recipes. */
  onShowPaywall?: () => void;
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
  { key: "sweet" as const, label: "Sweet", color: "#E5462E" },
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

export default function TasteProfileOverlay({ rankedRecipes, allergies, onBack, onComplete, onShowPaywall }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "profile">("loading");
  const [showShare, setShowShare] = useState(false);
  const scores = useMemo(() => inferProfile(rankedRecipes), [rankedRecipes]);
  const topTraits = useMemo(() => getTopTraits(scores), [scores]);
  const chefMatch = useMemo(() => matchChef(topTraits), [topTraits]);

  // 4-dimension flavor scores
  const flavorScores = useMemo(() => computeFlavorScores(rankedRecipes), [rankedRecipes]);

  // Cuisine preferences from recipe.cuisine field
  const topCuisines = useMemo(() => computeCuisineScores(rankedRecipes), [rankedRecipes]);

  const finish = () => {
    onComplete(flavorScores, topCuisines.map((c) => c.id));
    // Paywall enabled: save the profile, then hand control to the Plus upsell
    // (the parent owns the final navigation into the app).
    if (onShowPaywall) { onShowPaywall(); return; }
    router.replace("/recipes");
    // Land on the (now populated) recipes page and pop the "add" bottom sheet
    // so they can keep adding — BottomTabBar listens for this event.
    setTimeout(() => { try { window.dispatchEvent(new CustomEvent("openFabImport")); } catch { /* noop */ } }, 800);
  };

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
          <h2 className="text-xl font-black" style={{ color: "#1C1A17" }}>Generating your taste profile...</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#a09890" }}>
            The more recipes you save and meals you plan, the more accurate your taste profile becomes
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: "#E5462E", animation: `pulse-soft 1.2s ease-in-out ${i * 0.25}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }


  // ─── Taste Profile ───
  return (
    <div className="max-w-md mx-auto w-full flex flex-col min-h-[100svh]">
      <div className="flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="relative pt-6 pb-2 px-6 text-center">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="absolute left-4 top-5 w-9 h-9 flex items-center justify-center rounded-full active:scale-95 transition-transform"
              style={{ color: "#4A4742" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-[32px] font-black leading-none" style={{ color: "#1C1A17" }}>Taste DNA</h1>
        </div>

        {/* Taste look-a-like */}
        <div className="mx-5 mt-3 rounded-2xl p-4 animate-stagger-in" style={{ background: "white", border: "1px solid #eae7e2" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: "#E5462E" }}>Your taste look-a-like</p>
          <p className="text-lg font-black mb-0.5" style={{ color: "#1C1A17" }}>{chefMatch.name}</p>
          <p className="text-[12.5px] leading-snug line-clamp-2" style={{ color: "#555" }}>{chefMatch.description}</p>
        </div>

        {/* Flavor profile + top picks (or cuisines) */}
        <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 animate-stagger-in" style={{ animationDelay: "0.08s", background: "white", border: "1px solid #eae7e2" }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2.5" style={{ color: "#E5462E" }}>Flavor profile</p>
            <div className="space-y-2">
              {FLAVOR_DIMENSIONS.map((dim) => (
                <div key={dim.key}>
                  <span className="text-[10px] font-medium" style={{ color: "#1C1A17" }}>{dim.label}</span>
                  <div className="h-2 rounded-full overflow-hidden mt-0.5" style={{ background: "#efede8" }}>
                    <div className="h-full rounded-full animate-bar-fill" style={{ width: `${Math.max(flavorScores[dim.key], 8)}%`, background: dim.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-4 animate-stagger-in" style={{ animationDelay: "0.12s", background: "white", border: "1px solid #eae7e2" }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2.5" style={{ color: "#E5462E" }}>{rankedRecipes.length > 0 ? "Top picks" : "Top cuisines"}</p>
            {rankedRecipes.length > 0 ? (
              <div className="space-y-2">
                {rankedRecipes.slice(0, 3).map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[10px]" style={{ background: i === 0 ? "#E5462E" : i === 1 ? "#f07828" : "#f5a05c", color: "white" }}>{i + 1}</span>
                    <span className="text-[12px] font-semibold truncate" style={{ color: "#1C1A17" }}>{r.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-1.5 flex-wrap">
                {topCuisines.map((c) => (<span key={c.id} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "#f3f2ef", color: "#1C1A17" }}>{c.flag} {c.label}</span>))}
              </div>
            )}
          </div>
        </div>

        {/* Allergies — compact, single row */}
        <div className="mx-5 mt-3 rounded-2xl px-4 py-3 animate-stagger-in flex items-center gap-2 flex-wrap" style={{ animationDelay: "0.16s", background: "white", border: "1px solid #eae7e2" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#E5462E" }}>Keeping out</span>
          {allergies.length > 0 ? allergies.map((a) => (
            <span key={a} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>🚫 {a}</span>
          )) : <span className="text-[12px]" style={{ color: "#a09890" }}>Nothing — we&apos;ll suggest freely.</span>}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 pt-3 space-y-3">
        <button
          onClick={async () => {
            const text = `My Salt & Spoon Taste DNA look-a-like is ${chefMatch.name}! Top flavors: ${topTraits.slice(0, 3).map((t) => t.label).join(", ")} \u{1F525}`;
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
              try { await navigator.share({ title: "My Taste DNA", text }); } catch { /* cancelled */ }
            } else if (typeof navigator !== "undefined") {
              await navigator.clipboard.writeText(text);
            }
          }}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
          style={{ background: "#1C1A17", color: "white" }}
        >
          🔗 Share my Taste DNA
        </button>
        <button onClick={finish} className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]" style={{ background: "#E5462E" }}>
          Take me to my recipes
        </button>
      </div>

      {/* Share sheet */}
      {showShare && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowShare(false)} />
          <div className="relative w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 space-y-4 animate-slide-up bg-white">
            <div className="w-10 h-1 rounded-full mx-auto sm:hidden" style={{ background: "#eae7e2" }} />
            <h3 className="text-lg font-bold text-center" style={{ color: "#1C1A17" }}>Share Your Taste DNA</h3>
            <div className="p-4 rounded-xl" style={{ background: "#f8f7f5" }}>
              <p className="text-sm font-bold text-center mb-1" style={{ color: "#1C1A17" }}>Taste Look-A-Like: {chefMatch.name}</p>
              <p className="text-xs text-center leading-relaxed" style={{ color: "#555" }}>{chefMatch.description}</p>
            </div>
            <button
              onClick={async () => {
                const text = `My Salt & Spoon Taste DNA look-a-like is ${chefMatch.name}! Top flavors: ${topTraits.slice(0, 3).map((t) => t.label).join(", ")} \u{1F525}`;
                if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                  try { await navigator.share({ title: "My Taste DNA", text }); } catch { /* cancelled */ }
                } else if (typeof navigator !== "undefined") { await navigator.clipboard.writeText(text); }
                setShowShare(false);
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white" style={{ background: "#E5462E" }}
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
