"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTrending } from "@/lib/hooks/use-data";
import type { PromptRecipeResult } from "@/lib/claude";

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Context menu types ─────────────────────────────────────────────────────

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  recipeId: string;
  recipeTitle: string;
}

// ─── Questionnaire steps ────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "meal",
    question: "What meal is this for?",
    options: [
      { label: "Breakfast", emoji: "🌅", value: "breakfast" },
      { label: "Lunch", emoji: "🥪", value: "lunch" },
      { label: "Dinner", emoji: "🍽️", value: "dinner" },
      { label: "Snack", emoji: "🍿", value: "snack" },
      { label: "Any", emoji: "🎲", value: "" },
    ],
  },
  {
    id: "time",
    question: "How much time do you have?",
    options: [
      { label: "15 min", emoji: "⚡", value: "under 15 minutes" },
      { label: "30 min", emoji: "🕐", value: "about 30 minutes" },
      { label: "1 hour", emoji: "⏰", value: "about an hour" },
      { label: "No rush", emoji: "🧑‍🍳", value: "no time limit" },
    ],
  },
  {
    id: "vibe",
    question: "What's the vibe?",
    options: [
      { label: "Healthy", emoji: "🥗", value: "healthy and nutritious" },
      { label: "Comfort", emoji: "🍝", value: "warm comfort food" },
      { label: "Impress", emoji: "✨", value: "impressive for guests" },
      { label: "Quick & easy", emoji: "🍳", value: "quick and easy" },
      { label: "High protein", emoji: "💪", value: "high protein" },
      { label: "Budget", emoji: "💰", value: "budget friendly" },
    ],
  },
];

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: "🥞", lunch: "🥗", dinner: "🍽️", snack: "🍎",
};

// ─── Category definitions (driven by tags) ──────────────────────────────────

interface Category {
  title: string;
  emoji: string;
  tags?: string[]; // Match if any tag matches
  maxTime?: number; // Match if total time <= this
  filter?: (r: TrendingRecipe) => boolean;
}

const CATEGORIES: Category[] = [
  {
    title: "Quick Dinners",
    emoji: "⚡",
    filter: (r) => {
      const total = (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0);
      return total > 0 && total <= 30 && r.meal_type === "dinner";
    },
  },
  {
    title: "High Protein",
    emoji: "💪",
    tags: ["high-protein", "high protein", "protein", "chicken", "beef", "salmon", "tofu", "lamb", "pork"],
  },
  {
    title: "Comfort Food",
    emoji: "🍲",
    tags: ["comfort food", "comfort-food", "cozy", "hearty", "creamy"],
  },
  {
    title: "Plant-Based",
    emoji: "🌱",
    tags: ["vegetarian", "vegan", "plant-based"],
  },
  {
    title: "Asian-Inspired",
    emoji: "🥢",
    tags: ["asian", "chinese", "japanese", "korean", "thai", "vietnamese", "sichuan", "asian-inspired", "korean-inspired"],
  },
  {
    title: "Pasta & Noodles",
    emoji: "🍝",
    tags: ["pasta", "noodle", "noodles", "italian"],
  },
  {
    title: "Healthy & Light",
    emoji: "🥗",
    tags: ["healthy", "salad", "light", "fresh", "low-carb"],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function matchesCategory(recipe: TrendingRecipe, cat: Category): boolean {
  try {
    if (cat.filter) return cat.filter(recipe);
    if (cat.tags && Array.isArray(recipe.tags)) {
      const lowerTags = recipe.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.toLowerCase());
      return cat.tags.some((catTag) => lowerTags.some((t) => t.includes(catTag)));
    }
    if (cat.maxTime) {
      const total = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
      return total > 0 && total <= cat.maxTime;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Taste profile types & matching ────────────────────────────────────────

interface TasteProfile {
  all?: { sweet: number; savory: number; spicy: number; tangy: number; richness: number };
  cuisines?: { cuisine: string; label: string }[];
  cookingStyles?: { style: string; label: string }[];
}

// Lightweight client-side scoring: how well does this recipe match the user's taste?
function tasteMatchScore(recipe: TrendingRecipe, profile: TasteProfile | null): number {
  const popularityBase = (recipe?.userCount || 1) * 0.1;
  if (!profile || !recipe) return popularityBase;

  try {
    let score = 0;
    const tags = Array.isArray(recipe.tags) ? recipe.tags : [];
    const lowerTags = tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.toLowerCase());
    const titleLower = (recipe.title || "").toLowerCase();

    // Boost if recipe matches user's top cuisines (top cuisine gets highest weight)
    if (Array.isArray(profile.cuisines)) {
      for (let i = 0; i < profile.cuisines.length; i++) {
        const cuisineEntry = profile.cuisines[i];
        if (!cuisineEntry || typeof cuisineEntry.cuisine !== "string") continue;
        const cuisine = cuisineEntry.cuisine.toLowerCase();
        const weight = profile.cuisines.length - i;
        if (lowerTags.some((t) => t.includes(cuisine)) || titleLower.includes(cuisine)) {
          score += weight * 3;
        }
      }
    }

    // Boost if recipe matches user's top cooking styles
    if (Array.isArray(profile.cookingStyles)) {
      for (let i = 0; i < profile.cookingStyles.length; i++) {
        const style = profile.cookingStyles[i];
        if (!style || typeof style.style !== "string") continue;
        const weight = profile.cookingStyles.length - i;
        const styleKeywords = style.style.split("_").filter(Boolean);
        if (styleKeywords.some((kw) => lowerTags.some((t) => t.includes(kw)) || titleLower.includes(kw))) {
          score += weight * 2;
        }
      }
    }

    return score + popularityBase;
  } catch {
    return popularityBase;
  }
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function DiscoverTab({
  onAddToMealPlan,
  onAddToCollection,
}: {
  onAddToMealPlan?: (recipeId: string) => void;
  onAddToCollection?: (recipeId: string) => void;
}) {
  const router = useRouter();

  // ── Trending recipes ──
  const { data: trendingData, isLoading: trendingLoading } = useTrending();
  const trending: TrendingRecipe[] = trendingData?.trending ?? [];

  // ── Taste profile (for personalized sorting) ──
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);

  // ── Hero carousel state ──
  const [heroIndex, setHeroIndex] = useState(0);
  const heroSwipeStartX = useRef(0);

  // ── Explore / questionnaire state ──
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<PromptRecipeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [exploreError, setExploreError] = useState("");
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [exploreSavedIds, setExploreSavedIds] = useState<Set<number>>(new Set());
  const [questionStep, setQuestionStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Context menu state ──
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, recipeId: "", recipeTitle: "",
  });
  const ctxMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  // ── Computed: hero recipes (top 5 trending) + categorized rows ──
  const heroRecipes = useMemo(() => {
    if (!Array.isArray(trending)) return [];
    return trending.filter((r) => r && r.recipeId).slice(0, 5);
  }, [trending]);

  const categorizedRows = useMemo(() => {
    try {
      if (!Array.isArray(trending) || trending.length === 0) return [];
      return CATEGORIES.map((cat) => {
        const matched = trending.filter((r) => r && matchesCategory(r, cat));
        // Sort by personal taste match score (descending). Use slice() to avoid mutating.
        const sorted = matched.slice().sort(
          (a, b) => tasteMatchScore(b, tasteProfile) - tasteMatchScore(a, tasteProfile)
        );
        return { ...cat, recipes: sorted.slice(0, 10) };
      }).filter((row) => row.recipes.length > 0);
    } catch (err) {
      console.error("[Discover] categorizedRows failed:", err);
      return [];
    }
  }, [trending, tasteProfile]);

  // Fetch taste profile once on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/taste-profile")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d || d.error) return;
        // Only keep the fields we use, and only if they look right
        const cleaned: TasteProfile = {};
        if (Array.isArray(d.cuisines)) {
          cleaned.cuisines = d.cuisines.filter(
            (c: unknown): c is { cuisine: string; label: string } =>
              !!c && typeof c === "object" && typeof (c as { cuisine?: unknown }).cuisine === "string"
          );
        }
        if (Array.isArray(d.cookingStyles)) {
          cleaned.cookingStyles = d.cookingStyles.filter(
            (s: unknown): s is { style: string; label: string } =>
              !!s && typeof s === "object" && typeof (s as { style?: unknown }).style === "string"
          );
        }
        setTasteProfile(cleaned);
      })
      .catch(() => { /* silent — falls back to popularity ordering */ });
    return () => { cancelled = true; };
  }, []);

  // Auto-advance hero carousel every 6 seconds
  useEffect(() => {
    if (heroRecipes.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroRecipes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroRecipes.length]);

  // Reset hero index if recipes change
  useEffect(() => {
    setHeroIndex(0);
  }, [heroRecipes.length]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }
  }, [prompt]);

  // Close context menu on outside click / scroll
  useEffect(() => {
    if (!ctxMenu.visible) return;
    function close() { setCtxMenu((prev) => ({ ...prev, visible: false })); }
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [ctxMenu.visible]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (showQuestionnaireModal) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [showQuestionnaireModal]);

  // ── Context menu helpers ──
  const openCtxMenu = useCallback((x: number, y: number, recipeId: string, recipeTitle: string) => {
    const menuW = 180, menuH = 100;
    const cx = Math.min(x, window.innerWidth - menuW - 8);
    const cy = Math.min(y, window.innerHeight - menuH - 8);
    setCtxMenu({ visible: true, x: cx, y: cy, recipeId, recipeTitle });
  }, []);

  const handleCtxSave = useCallback(() => {
    const { recipeId } = ctxMenu;
    setCtxMenu((prev) => ({ ...prev, visible: false }));
    onAddToCollection?.(recipeId);
  }, [ctxMenu, onAddToCollection]);

  const handleCtxPlan = useCallback(() => {
    const { recipeId } = ctxMenu;
    setCtxMenu((prev) => ({ ...prev, visible: false }));
    onAddToMealPlan?.(recipeId);
  }, [ctxMenu, onAddToMealPlan]);

  const startLongPress = useCallback((recipeId: string, recipeTitle: string) => (e: React.TouchEvent) => {
    longPressTriggered.current = false;
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      openCtxMenu(x, y, recipeId, recipeTitle);
    }, 500);
  }, [openCtxMenu]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleRightClick = useCallback((recipeId: string, recipeTitle: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    openCtxMenu(e.clientX, e.clientY, recipeId, recipeTitle);
  }, [openCtxMenu]);

  // ── Explore handlers ──

  async function handleSearch(text: string) {
    if (!text.trim() || searching) return;
    setSearching(true);
    setExploreError("");
    setResults([]);
    setExploreSavedIds(new Set());
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
      setExploreError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSearching(false);
    }
  }

  function handleQuestionAnswer(questionId: string, value: string) {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    if (questionStep < QUESTIONS.length - 1) {
      setQuestionStep(questionStep + 1);
    } else {
      const parts: string[] = [];
      if (newAnswers.meal) parts.push(`a ${newAnswers.meal} recipe`);
      else parts.push("a recipe");
      if (newAnswers.time) parts.push(`that takes ${newAnswers.time}`);
      if (newAnswers.vibe) parts.push(`that is ${newAnswers.vibe}`);
      const builtPrompt = `Find me ${parts.join(" ")}`;
      setPrompt(builtPrompt);
      setShowQuestionnaireModal(false);
      handleSearch(builtPrompt);
    }
  }

  function handleResetQuestionnaire() {
    setQuestionStep(0);
    setAnswers({});
    setResults([]);
    setPrompt("");
    setExploreError("");
  }

  function openQuestionnaire() {
    setQuestionStep(0);
    setAnswers({});
    setShowQuestionnaireModal(true);
  }

  function handleSubmit() {
    if (!prompt.trim() || searching) return;
    handleSearch(prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleExploreSave(result: PromptRecipeResult, index: number) {
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
          meal_type: result.recipe.tags?.includes("breakfast") ? "breakfast"
            : result.recipe.tags?.includes("lunch") ? "lunch"
            : result.recipe.tags?.includes("snack") ? "snack" : "dinner",
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
      setExploreSavedIds((prev) => new Set(prev).add(index));
    } catch (err) {
      setExploreError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingIndex(null);
    }
  }

  // ── Render ──

  const showLanding = results.length === 0 && !searching && !exploreError;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-5" style={{ background: "#faf9f7" }}>

      {/* AI Prompt Input — always visible at top */}
      <div className="mb-6">
        <div
          className="bg-white rounded-3xl p-4"
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
        >
          <div className="flex items-start gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #ffe4d3 0%, #ffd4b3 100%)",
              }}
            >
              <span className="text-lg">{"\u2728"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#a09890" }}>
                Ask Marco
              </p>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What are you in the mood for?"
                rows={1}
                disabled={searching}
                className="w-full resize-none text-sm outline-none bg-transparent min-h-[24px] max-h-[96px] font-medium placeholder:text-gray-300"
                style={{ color: "#1a1410" }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || searching}
              className="w-9 h-9 flex items-center justify-center rounded-2xl flex-shrink-0 transition-all active:scale-90 disabled:opacity-30"
              style={{ background: "#1a1410" }}
              aria-label="Send"
            >
              {searching ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <button
              onClick={openQuestionnaire}
              className="text-[11px] font-bold transition-colors flex items-center gap-1"
              style={{ color: "#f97316" }}
            >
              <span>{"\u{1F4DD}"}</span>
              <span>Need ideas? Take a 30-sec quiz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explore error */}
      {exploreError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{exploreError}</div>
      )}

      {/* Explore loading */}
      {searching && (
        <div className="text-center py-16">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <svg className="w-full h-full animate-spin" style={{ animationDuration: "2s" }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f97316" strokeWidth="6" strokeDasharray="264" strokeDashoffset="198" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl">{"\u{1F373}"}</span></div>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Cooking up ideas...</p>
          <p className="text-xs text-gray-400">Finding the perfect recipes for you</p>
        </div>
      )}

      {/* Explore results */}
      {results.length > 0 && !searching && (
        <div className="space-y-4 animate-fade-slide-up mb-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#a09890" }}>
              {results.length} recipes found
            </p>
            <button onClick={handleResetQuestionnaire} className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors" style={{ color: "#a09890", background: "#ede9e3" }}>
              Clear
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((result, i) => (
              <ExploreResultCard
                key={i}
                result={result}
                onSave={() => handleExploreSave(result, i)}
                saving={savingIndex === i}
                saved={exploreSavedIds.has(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Categorized landing layout */}
      {showLanding && (
        <div className="animate-fade-slide-up">
          {trendingLoading ? (
            <>
              <div className="h-72 skeleton-warm rounded-3xl mb-6" />
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="h-4 w-32 skeleton-warm rounded-full mb-3" />
                    <div className="flex gap-3 overflow-hidden">
                      {[1, 2, 3].map((j) => <div key={j} className="h-44 w-40 skeleton-warm rounded-2xl flex-shrink-0" />)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : trending.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <span className="text-4xl mb-3 block">{"\u{1F30E}"}</span>
              <p className="text-base font-semibold text-gray-800 mb-1">Nothing trending yet</p>
              <p className="text-sm text-gray-400 max-w-[260px] mx-auto leading-relaxed">
                As more people use Marco, popular recipes will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Hero carousel — top 5 trending recipes */}
              {heroRecipes.length > 0 && (
                <div
                  className="mb-7 relative rounded-3xl overflow-hidden"
                  style={{
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    height: "320px",
                  }}
                  onTouchStart={(e) => {
                    heroSwipeStartX.current = e.touches[0].clientX;
                  }}
                  onTouchEnd={(e) => {
                    const dx = e.changedTouches[0].clientX - heroSwipeStartX.current;
                    if (Math.abs(dx) > 50) {
                      if (dx < 0) setHeroIndex((heroIndex + 1) % heroRecipes.length);
                      else setHeroIndex((heroIndex - 1 + heroRecipes.length) % heroRecipes.length);
                    }
                  }}
                >
                  {/* Slides */}
                  {heroRecipes.map((recipe, i) => (
                    <div
                      key={recipe.recipeId}
                      className="absolute inset-0 cursor-pointer transition-opacity duration-500"
                      style={{ opacity: i === heroIndex ? 1 : 0, pointerEvents: i === heroIndex ? "auto" : "none" }}
                      onClick={() => router.push(`/recipes/${recipe.recipeId}`)}
                      onContextMenu={handleRightClick(recipe.recipeId, recipe.title)}
                    >
                      {recipe.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                          <span className="text-6xl">{MEAL_EMOJIS[recipe.meal_type] ?? "🍳"}</span>
                        </div>
                      )}
                      {/* Dark gradient overlay */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)",
                        }}
                      />
                      {/* Trending pill */}
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm">
                        <span className="text-sm">{"\u{1F525}"}</span>
                        <span className="text-[11px] font-bold" style={{ color: "#1a1410" }}>Trending Tonight</span>
                      </div>
                      {/* Title and meta */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 pb-9 text-white">
                        <h2 className="text-2xl font-black leading-tight mb-2 line-clamp-2">{recipe.title}</h2>
                        <div className="flex items-center gap-3 text-xs font-semibold">
                          {((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)) > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
                            </span>
                          )}
                          {recipe.userCount > 1 && (
                            <span>{"\u00B7"} {recipe.userCount} cooks loved it</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Carousel dots */}
                  {heroRecipes.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
                      {heroRecipes.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setHeroIndex(i); }}
                          className="transition-all rounded-full"
                          style={{
                            width: i === heroIndex ? 24 : 6,
                            height: 6,
                            background: i === heroIndex ? "#ffffff" : "rgba(255,255,255,0.5)",
                          }}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Categorized rows */}
              <div className="space-y-7">
                {categorizedRows.map((row) => (
                  <CategoryRow
                    key={row.title}
                    title={row.title}
                    emoji={row.emoji}
                    recipes={row.recipes}
                    onTap={(id) => router.push(`/recipes/${id}`)}
                    onLongPress={(id, title, e) => {
                      longPressTriggered.current = false;
                      const touch = e.touches[0];
                      longPressTimer.current = setTimeout(() => {
                        longPressTriggered.current = true;
                        if (navigator.vibrate) navigator.vibrate(30);
                        openCtxMenu(touch.clientX, touch.clientY, id, title);
                      }, 500);
                    }}
                    onLongPressCancel={cancelLongPress}
                    onContextMenu={handleRightClick}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Questionnaire Modal ──────────────────────────────────────── */}
      {showQuestionnaireModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowQuestionnaireModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: "#1a1410" }}>
                Find me a recipe
              </h2>
              <button
                onClick={() => setShowQuestionnaireModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: i === questionStep ? 24 : 8, background: i <= questionStep ? "#f97316" : "#ede9e3" }}
                />
              ))}
            </div>

            {/* Question */}
            <div key={QUESTIONS[questionStep].id}>
              <h3 className="text-base font-bold mb-4" style={{ color: "#1a1410" }}>
                {QUESTIONS[questionStep].question}
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {QUESTIONS[questionStep].options.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => handleQuestionAnswer(QUESTIONS[questionStep].id, opt.value)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                    style={{
                      background: answers[QUESTIONS[questionStep].id] === opt.value ? "#fff3e8" : "#fff",
                      border: `1.5px solid ${answers[QUESTIONS[questionStep].id] === opt.value ? "#f97316" : "#ede9e3"}`,
                      boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                      animation: `fadeSlideUp 0.3s ease ${i * 40}ms both`,
                    }}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-xs font-bold" style={{ color: "#1a1410" }}>{opt.label}</span>
                  </button>
                ))}
              </div>
              {questionStep > 0 && (
                <button
                  onClick={() => setQuestionStep(questionStep - 1)}
                  className="mt-4 text-xs font-semibold transition-colors"
                  style={{ color: "#a09890" }}
                >
                  ← Back
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Context menu (right-click / long-press) ──────────────── */}
      {ctxMenu.visible && (
        <div
          ref={ctxMenuRef}
          className="fixed z-50"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[180px]"
            style={{
              boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
              animation: "ctxMenuPop 0.15s ease both",
            }}
          >
            <div className="px-4 py-2.5 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-900 line-clamp-1">{ctxMenu.recipeTitle}</p>
            </div>
            <button
              onClick={handleCtxSave}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 transition-colors active:bg-orange-100"
            >
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>Save to Collection</span>
            </button>
            {onAddToMealPlan && (
              <button
                onClick={handleCtxPlan}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 transition-colors active:bg-orange-100 border-t border-gray-50"
              >
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Add to Meal Plan</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes ctxMenuPop {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ─── Category Row (horizontal scroll) ──────────────────────────────────────

function CategoryRow({
  title,
  emoji,
  recipes,
  onTap,
  onLongPress,
  onLongPressCancel,
  onContextMenu,
}: {
  title: string;
  emoji: string;
  recipes: TrendingRecipe[];
  onTap: (id: string) => void;
  onLongPress: (id: string, title: string, e: React.TouchEvent) => void;
  onLongPressCancel: () => void;
  onContextMenu: (id: string, title: string) => (e: React.MouseEvent) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <h3 className="text-base font-black" style={{ color: "#1a1410" }}>
            {title}
          </h3>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {recipes.map((recipe) => (
          <div
            key={recipe.recipeId}
            className="flex-shrink-0 w-40 sm:w-44"
            style={{ scrollSnapAlign: "start" }}
            onContextMenu={onContextMenu(recipe.recipeId, recipe.title)}
            onTouchStart={(e) => onLongPress(recipe.recipeId, recipe.title, e)}
            onTouchMove={onLongPressCancel}
            onTouchEnd={onLongPressCancel}
          >
            <CategoryCard recipe={recipe} onTap={() => onTap(recipe.recipeId)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  recipe,
  onTap,
}: {
  recipe: TrendingRecipe;
  onTap: () => void;
}) {
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform select-none"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
      onClick={onTap}
    >
      <div className="relative h-32 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span className="text-3xl opacity-70">{MEAL_EMOJIS[recipe.meal_type] ?? "🍳"}</span>
        )}
        {totalTime > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {totalTime} min
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-bold text-gray-900 text-xs leading-tight line-clamp-2">{recipe.title}</h4>
      </div>
    </div>
  );
}

// ─── Explore result card ────────────────────────────────────────────────────

function ExploreResultCard({
  result,
  onSave,
  saving,
  saved,
}: {
  result: PromptRecipeResult;
  onSave: () => void;
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
      {result.image_url ? (
        <div className="relative h-36 sm:h-40 bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.image_url} alt={recipe.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white whitespace-nowrap">{result.sourceHint || "Explore"}</span>
          </div>
          {sourceHost && (
            <div className="absolute bottom-2 left-2">
              <a href={result.source_url!} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-600 hover:text-orange-600 transition-colors flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                {sourceHost}
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
          <span className="text-3xl">🍽️</span>
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-gray-500 whitespace-nowrap">{result.sourceHint || "Explore"}</span>
          </div>
        </div>
      )}

      <div className="p-4 pb-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">{recipe.title}</h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{recipe.description}</p>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {totalTime}m
            </span>
          )}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
          {recipe.ingredients?.length > 0 && <span>{recipe.ingredients.length} ingredients</span>}
        </div>
        {result.source_url && sourceHost && (
          <a href={result.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] text-orange-500 hover:text-orange-600 font-medium transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            View original on {sourceHost}
          </a>
        )}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-gray-50 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>

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
            <p className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-50">{result.reasoning}</p>
          )}
        </div>
      )}

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
            saved ? "text-green-600 bg-green-50/50" : saving ? "text-gray-400" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50/50"
          }`}
        >
          {saved ? (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Saved</>
          ) : saving ? (
            <><div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />Saving...</>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Save</>
          )}
        </button>
      </div>
    </div>
  );
}
