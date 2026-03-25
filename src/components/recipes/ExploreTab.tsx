"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PromptRecipeResult } from "@/lib/claude";

interface TrendingRecipe {
  recipeId: string;
  title: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  meal_type: string;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  source_url: string | null;
  saveCount: number;
  userCount: number;
}

// ─── Suggestion categories ──────────────────────────────────────────────────
const CATEGORIES = [
  { label: "Quick weeknight", emoji: "🍳", prompt: "Quick weeknight dinner under 30 minutes" },
  { label: "Healthy", emoji: "🥗", prompt: "Healthy balanced meal with lots of vegetables" },
  { label: "Comfort food", emoji: "🍝", prompt: "Warm comfort food perfect for a cozy night in" },
  { label: "High protein", emoji: "💪", prompt: "High protein meal for muscle building" },
  { label: "Meal prep", emoji: "📦", prompt: "Easy meal prep recipe that stores well for the week" },
  { label: "Impress guests", emoji: "✨", prompt: "Impressive dinner party recipe that looks fancy but is doable" },
  { label: "One-pot", emoji: "🫕", prompt: "One-pot or one-pan recipe with minimal cleanup" },
  { label: "Budget friendly", emoji: "💰", prompt: "Budget-friendly meal under $10 for the whole family" },
];

// ─── Main component ─────────────────────────────────────────────────────────
export default function ExploreTab() {
  const supabase = createClient();

  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<PromptRecipeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [trending, setTrending] = useState<TrendingRecipe[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch trending recipes on mount
  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await fetch("/api/recipes/trending");
        if (!res.ok) return;
        const data = await res.json();
        setTrending(data.trending || []);
      } catch {
        // ignore
      } finally {
        setTrendingLoading(false);
      }
    }
    fetchTrending();
  }, []);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }
  }, [prompt]);

  async function handleSearch(text: string) {
    if (!text.trim() || searching) return;
    setSearching(true);
    setError("");
    setResults([]);
    setSavedIds(new Set());
    try {
      const res = await fetch("/api/meal-plan/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text.trim(), context: "all" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSearching(false);
    }
  }

  function handleCategoryClick(cat: typeof CATEGORIES[number]) {
    setActiveCategory(cat.label);
    setPrompt(cat.prompt);
    handleSearch(cat.prompt);
  }

  function handleSubmit() {
    if (!prompt.trim() || searching) return;
    setActiveCategory(null);
    handleSearch(prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleSave(result: PromptRecipeResult, index: number) {
    setSavingIndex(index);
    try {
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.recipe.title,
          description: result.recipe.description,
          ingredients: result.recipe.ingredients,
          steps: result.recipe.steps,
          servings: result.recipe.servings,
          prep_time_minutes: result.recipe.prep_time_minutes,
          cook_time_minutes: result.recipe.cook_time_minutes,
          tags: result.recipe.tags,
          meal_type: result.recipe.tags?.includes("breakfast")
            ? "breakfast"
            : result.recipe.tags?.includes("lunch")
            ? "lunch"
            : result.recipe.tags?.includes("snack")
            ? "snack"
            : "dinner",
          image_url: result.image_url || null,
          source_url: result.source_url || null,
          source_platform: result.source_url ? "other" : null,
          notes: `Discovered via Explore.\n${result.reasoning}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSavedIds((prev) => new Set(prev).add(index));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingIndex(null);
    }
  }

  async function handleAddToPlan(result: PromptRecipeResult, index: number) {
    // Save first if not saved, then add to plan
    if (!savedIds.has(index)) {
      await handleSave(result, index);
    }
  }

  // ─── No results yet — show explore landing ──────────────────────────────────
  const showLanding = results.length === 0 && !searching && !error;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-5" style={{ background: "#faf9f7" }}>
      {/* Headline */}
      <div className="mb-5 animate-fade-slide-up">
        <h2 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>Explore</h2>
        <p className="text-sm mt-1" style={{ color: "#a09890" }}>Describe what you&apos;re craving</p>
      </div>

      {/* Search input */}
      <div className="bg-white rounded-3xl p-4 mb-5 animate-fade-slide-up" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)", animationDelay: "60ms" }}>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to cook?"
            rows={1}
            disabled={searching}
            className="flex-1 resize-none text-sm outline-none bg-transparent py-1 min-h-[36px] max-h-[96px] font-medium"
            style={{ color: "#1a1410" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || searching}
            className="w-10 h-10 flex items-center justify-center rounded-2xl flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{ background: "#1a1410" }}
          >
            {searching ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Category chips */}
      {showLanding && (
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => handleCategoryClick(cat)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
              style={{
                background: activeCategory === cat.label ? "#fff3e8" : "#fff",
                border: `1.5px solid ${activeCategory === cat.label ? "#f97316" : "#ede9e3"}`,
                boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                animation: `fadeSlideUp 0.35s ease ${i * 40}ms both`,
              }}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span className="text-xs font-bold" style={{ color: "#1a1410" }}>{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{error}</div>
      )}

      {/* Loading state */}
      {searching && (
        <div className="text-center py-16">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <svg className="w-full h-full animate-spin" style={{ animationDuration: "2s" }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f97316" strokeWidth="6" strokeDasharray="264" strokeDashoffset="198" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl">🍳</span>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Cooking up ideas...</p>
          <p className="text-xs text-gray-400">Finding the perfect recipes for you</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !searching && (
        <div className="space-y-4 animate-fade-slide-up">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#a09890" }}>
              {results.length} recipes found
            </p>
            <button
              onClick={() => { setResults([]); setPrompt(""); setActiveCategory(null); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{ color: "#a09890", background: "#ede9e3" }}
            >
              Clear
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((result, i) => (
              <ExploreResultCard
                key={i}
                result={result}
                onSave={() => handleSave(result, i)}
                onAddToPlan={() => handleAddToPlan(result, i)}
                saving={savingIndex === i}
                saved={savedIds.has(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      {showLanding && (
        <>
          {trendingLoading ? (
            <div className="space-y-3">
              <div className="h-3 skeleton-warm rounded-full w-40" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1,2,3,4].map((i) => <div key={i} className="h-40 skeleton-warm rounded-3xl" />)}
              </div>
            </div>
          ) : trending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔥</span>
                <h3 className="text-sm font-black" style={{ color: "#1a1410" }}>Popular right now</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {trending.map((recipe, i) => (
                  <div key={recipe.recipeId} style={{ animation: `cardPop 0.4s ease ${i * 50}ms both` }}>
                    <TrendingCard recipe={recipe} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Trending card ──────────────────────────────────────────────────────────
function TrendingCard({ recipe }: { recipe: TrendingRecipe }) {
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <a
      href={`/recipes/${recipe.recipeId}`}
      className="bg-white rounded-3xl overflow-hidden block active:scale-[0.97] transition-transform"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
    >
      {recipe.image_url ? (
        <div className="h-28 sm:h-32 bg-gray-100 overflow-hidden relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {recipe.userCount > 1 && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                {recipe.userCount} saves
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center relative">
          <span className="text-2xl">
            {recipe.meal_type === "breakfast" ? "🌅" : recipe.meal_type === "lunch" ? "☀️" : recipe.meal_type === "snack" ? "🍎" : "🍽️"}
          </span>
          {recipe.userCount > 1 && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                {recipe.userCount} saves
              </span>
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <h4 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2 mb-1">
          {recipe.title}
        </h4>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          {totalTime > 0 && <span>{totalTime}m</span>}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
        </div>
      </div>
    </a>
  );
}

// ─── Result card ────────────────────────────────────────────────────────────
function ExploreResultCard({
  result,
  onSave,
  onAddToPlan,
  saving,
  saved,
}: {
  result: PromptRecipeResult;
  onSave: () => void;
  onAddToPlan: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { recipe } = result;
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  const sourceHost = result.source_url
    ? (() => { try { return new URL(result.source_url).hostname.replace("www.", ""); } catch { return null; } })()
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      {result.image_url ? (
        <div className="relative h-36 sm:h-40 bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white whitespace-nowrap">
              {result.sourceHint || "Explore"}
            </span>
          </div>
          {sourceHost && (
            <div className="absolute bottom-2 left-2">
              <a
                href={result.source_url!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-600 hover:text-orange-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {sourceHost}
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
          <span className="text-3xl">🍽️</span>
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-gray-500 whitespace-nowrap">
              {result.sourceHint || "Explore"}
            </span>
          </div>
        </div>
      )}

      {/* Card content */}
      <div className="p-4 pb-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">
          {recipe.title}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{recipe.description}</p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {totalTime}m
            </span>
          )}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
          {recipe.ingredients?.length > 0 && (
            <span>{recipe.ingredients.length} ingredients</span>
          )}
        </div>

        {/* Source link */}
        {result.source_url && sourceHost && (
          <a
            href={result.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-[11px] text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View original on {sourceHost}
          </a>
        )}

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-gray-50 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expandable recipe details */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-50 pt-3 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ingredients</p>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-orange-300 flex-shrink-0 mt-1.5" />
                  <span>
                    {ing.amount && <strong className="text-gray-700">{ing.amount} </strong>}
                    {ing.unit && <span>{ing.unit} </span>}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Steps</p>
            <ol className="text-xs text-gray-600 space-y-1.5">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-orange-500 font-bold flex-shrink-0 w-4 text-right">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          {result.reasoning && (
            <p className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-50">
              {result.reasoning}
            </p>
          )}
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center border-t border-gray-50 divide-x divide-gray-50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50/50 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? "Less" : "Details"}
        </button>
        <button
          onClick={onSave}
          disabled={saving || saved}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            saved
              ? "text-green-600 bg-green-50/50"
              : saving
              ? "text-gray-400"
              : "text-gray-500 hover:text-orange-600 hover:bg-orange-50/50"
          }`}
        >
          {saved ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </>
          ) : saving ? (
            <>
              <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}
