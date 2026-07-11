"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TASTE_DIMENSIONS } from "./data/taste-dimensions";
import type { RankingRecipe } from "./data/ranking-recipes";
import GuidedShell from "./guided/GuidedShell";

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
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onComplete: (tasteScores?: TasteScores, cuisinePreferences?: string[]) => void;
  /** When provided, finishing saves the profile and hands control back to the
   *  parent (the attribution slide, then the Plus upsell when enabled) instead
   *  of navigating straight to /recipes. */
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

export default function TasteProfileOverlay({ rankedRecipes, signatureDish, allergies, step, totalSteps, onBack, onComplete, onShowPaywall }: Props) {
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
      <div className="flex flex-col items-center justify-center px-8" style={{ background: "#F5EEE2", minHeight: "100dvh" }}>
        <span className="marco-signature is-pulsing mb-10" style={{ fontSize: "2.25rem" }}>Marco</span>
        <span className="text-6xl block animate-pulse-soft mb-6">{"\u{1F9EC}"}</span>
        <h2
          className="text-center"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "26px",
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          Reading your <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>taste</em>…
        </h2>
        <p
          className="text-center mt-3 max-w-xs"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "15px",
            lineHeight: 1.45,
            color: "var(--ink-soft, #4A4742)",
          }}
        >
          The more recipes you save and meals you plan, the sharper this gets.
        </p>
        <div className="flex justify-center gap-2 pt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: "var(--tomato, #E5462E)", animation: `pulse-soft 1.2s ease-in-out ${i * 0.25}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }


  // ─── Taste Profile ───
  return (
   <>
    <GuidedShell
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <div className="space-y-3">
          <button
            onClick={async () => {
              const text = `My Marco Taste DNA look-a-like is ${chefMatch.name}! Top flavors: ${topTraits.slice(0, 3).map((t) => t.label).join(", ")} \u{1F525}`;
              if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                try { await navigator.share({ title: "My Taste DNA", text }); } catch { /* cancelled */ }
              } else if (typeof navigator !== "undefined") {
                await navigator.clipboard.writeText(text);
              }
            }}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ background: "var(--ink, #1C1A17)", color: "white" }}
          >
            🔗 Share my Taste DNA
          </button>
          <button
            onClick={finish}
            className="w-full py-4 rounded-2xl font-semibold text-base text-white transition-all active:scale-[0.98]"
            style={{ background: "var(--tomato, #E5462E)" }}
          >
            Take me to my recipes
          </button>
        </div>
      }
    >
      {/* Heading */}
      <div className="text-center pt-6 pb-1 animate-stagger-in" style={{ animationDelay: "0.03s" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 72, "SOFT" 100, "wght" 600',
            fontSize: "32px",
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "var(--ink, #1C1A17)",
          }}
        >
          Your <em style={{ color: "var(--tomato, #E5462E)", fontStyle: "italic" }}>Taste DNA</em>
        </h1>
      </div>

      {/* Taste look-a-like */}
      <div className="mt-4 rounded-2xl p-4 animate-stagger-in" style={{ background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: "#E5462E" }}>Your taste look-a-like</p>
          <p className="mb-1" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 40, "wght" 600', fontSize: "20px", color: "var(--ink, #1C1A17)" }}>{chefMatch.name}</p>
          <p className="text-[12.5px] leading-snug line-clamp-2" style={{ color: "var(--ink-soft, #4A4742)" }}>{chefMatch.description}</p>
        </div>

        {/* Flavor profile + top picks (or cuisines) */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 animate-stagger-in" style={{ animationDelay: "0.08s", background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)" }}>
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
          <div className="rounded-2xl p-4 animate-stagger-in" style={{ animationDelay: "0.12s", background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)" }}>
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

        {/* Dream meal — the free-text answer, quoted back */}
        {signatureDish.trim() && (
          <div className="mt-3 rounded-2xl px-4 py-3 animate-stagger-in flex items-baseline gap-2 flex-wrap" style={{ animationDelay: "0.14s", background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)" }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] flex-shrink-0" style={{ color: "#E5462E" }}>Dream meal</span>
            <span
              className="text-[13px] min-w-0"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", color: "var(--ink, #1C1A17)" }}
            >
              &ldquo;{signatureDish.trim()}&rdquo;
            </span>
          </div>
        )}

        {/* Allergies — compact, single row */}
        <div className="mt-3 mb-4 rounded-2xl px-4 py-3 animate-stagger-in flex items-center gap-2 flex-wrap" style={{ animationDelay: "0.16s", background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#E5462E" }}>Keeping out</span>
          {allergies.length > 0 ? allergies.map((a) => (
            <span key={a} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>🚫 {a}</span>
          )) : <span className="text-[12px]" style={{ color: "var(--ink-soft, #4A4742)" }}>Nothing — we&apos;ll suggest freely.</span>}
        </div>
    </GuidedShell>

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
                const text = `My Marco Taste DNA look-a-like is ${chefMatch.name}! Top flavors: ${topTraits.slice(0, 3).map((t) => t.label).join(", ")} \u{1F525}`;
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
   </>
  );
}
