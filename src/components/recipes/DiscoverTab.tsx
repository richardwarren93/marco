"use client";

import { useState, useRef, useEffect } from "react";
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

interface FriendRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tags: string[];
  image_url: string | null;
  source_platform: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  meal_type: string;
  created_at: string;
  owner_name: string;
  owner_avatar: string | null;
  owner_id: string;
  is_planned: boolean;
  planning_friends: { name: string; avatar: string | null }[];
  next_planned_date: string | null;
}

type FeedMode = "friends" | "community";

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatPlannedDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 0 && diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  // ── Feed state ──
  const [feedMode, setFeedMode] = useState<FeedMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("marco-feed-mode") as FeedMode) || "friends";
    }
    return "friends";
  });

  // ── Friends feed state ──
  const [friendRecipes, setFriendRecipes] = useState<FriendRecipe[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState("");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // ── Community feed state ──
  const { data: trendingData, isLoading: trendingLoading } = useTrending();
  const trending: TrendingRecipe[] = trendingData?.trending ?? [];

  // ── Explore / questionnaire state ──
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<PromptRecipeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [exploreError, setExploreError] = useState("");
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [exploreSavedIds, setExploreSavedIds] = useState<Set<number>>(new Set());
  const [questionStep, setQuestionStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showRawInput, setShowRawInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist feed mode
  useEffect(() => {
    localStorage.setItem("marco-feed-mode", feedMode);
  }, [feedMode]);

  // Fetch friends activity
  useEffect(() => {
    let cancelled = false;
    async function fetchFriendsActivity() {
      try {
        const res = await fetch("/api/recipes/friends-activity");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled) setFriendRecipes(data.recipes || []);
      } catch (err) {
        if (!cancelled) setFriendsError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setFriendsLoading(false);
      }
    }
    fetchFriendsActivity();
    return () => { cancelled = true; };
  }, []);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }
  }, [prompt]);

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
      handleSearch(builtPrompt);
    }
  }

  function handleResetQuestionnaire() {
    setQuestionStep(0);
    setAnswers({});
    setResults([]);
    setPrompt("");
    setExploreError("");
    setShowRawInput(false);
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

  // ── Friends feed handlers ──

  async function handleSaveFriendRecipe(recipe: FriendRecipe) {
    if (savingIds.has(recipe.id) || savedIds.has(recipe.id)) return;
    setSavingIds((prev) => new Set(prev).add(recipe.id));
    try {
      const detailRes = await fetch(`/api/recipes/${recipe.id}`);
      if (!detailRes.ok) throw new Error("Could not load recipe");
      const detail = await detailRes.json();
      const r = detail.recipe || detail;
      const res = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: r.title, description: r.description, ingredients: r.ingredients,
          steps: r.steps, servings: r.servings, prep_time_minutes: r.prep_time_minutes,
          cook_time_minutes: r.cook_time_minutes, tags: r.tags, meal_type: r.meal_type,
          source_url: r.source_url, source_platform: r.source_platform, image_url: r.image_url,
          notes: r.notes ? `${r.notes}\n\nSaved from ${recipe.owner_name}` : `Saved from ${recipe.owner_name}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.duplicate) { setSavedIds((prev) => new Set(prev).add(recipe.id)); return; }
        throw new Error(data.error || "Failed to save");
      }
      setSavedIds((prev) => new Set(prev).add(recipe.id));
    } catch (err) {
      console.error("Save recipe error:", err);
    } finally {
      setSavingIds((prev) => { const next = new Set(prev); next.delete(recipe.id); return next; });
    }
  }

  // ── Render ──

  const showLanding = results.length === 0 && !searching && !exploreError;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-5" style={{ background: "#faf9f7" }}>

      {/* ── Hero: Find your next meal ─────────────────────────────── */}
      <div className="mb-6 animate-fade-slide-up">
        <h2 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>Discover</h2>
        <p className="text-sm mt-1" style={{ color: "#a09890" }}>
          {showRawInput ? "Describe what you\u2019re craving" : "Find your next meal"}
        </p>
      </div>

      {/* Raw text input */}
      {showRawInput && (
        <div className="bg-white rounded-3xl p-4 mb-5 animate-fade-slide-up" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
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
      )}

      {/* Questionnaire flow */}
      {showLanding && !showRawInput && (
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === questionStep ? 24 : 8, background: i <= questionStep ? "#f97316" : "#ede9e3" }}
              />
            ))}
          </div>
          <div key={QUESTIONS[questionStep].id} className="bg-white rounded-3xl p-5 animate-fade-slide-up" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
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
              <button onClick={() => setQuestionStep(questionStep - 1)} className="mt-3 text-xs font-semibold transition-colors" style={{ color: "#a09890" }}>
                ← Back
              </button>
            )}
          </div>
          <div className="text-center mt-4">
            <button onClick={() => setShowRawInput(true)} className="text-xs font-semibold transition-colors" style={{ color: "#a09890" }}>
              Or just type what you want
            </button>
          </div>
        </div>
      )}

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
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl">🍳</span></div>
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

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="h-px bg-gray-200/70 my-1 mb-5" />

      {/* ── Feed toggle: For You / Community ─────────────────────── */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 rounded-2xl p-1 max-w-[260px]">
        <button
          onClick={() => setFeedMode("friends")}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            feedMode === "friends"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          For You
        </button>
        <button
          onClick={() => setFeedMode("community")}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            feedMode === "community"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Community
        </button>
      </div>

      {/* ── For You feed (friends activity) ───────────────────────── */}
      {feedMode === "friends" && (
        <div className="animate-fade-slide-up">
          {friendsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 shadow-sm animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                      <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : friendsError ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <span className="text-3xl mb-3 block">😕</span>
              <p className="text-sm text-gray-500">{friendsError}</p>
            </div>
          ) : friendRecipes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <span className="text-4xl mb-3 block">👋</span>
              <p className="text-base font-semibold text-gray-800 mb-1">No friend activity yet</p>
              <p className="text-sm text-gray-400 max-w-[260px] mx-auto leading-relaxed">
                When your friends save or plan recipes, they&apos;ll show up here
              </p>
              <button
                onClick={() => router.push("/friends")}
                className="mt-4 px-5 py-2 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition-colors shadow-sm"
              >
                Find friends
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Friends are cooking */}
              {friendRecipes.some((r) => r.is_planned) && (
                <>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-1">
                    🔥 Friends are cooking
                  </p>
                  {friendRecipes.filter((r) => r.is_planned).map((recipe, i) => (
                    <div key={recipe.id} style={{ animation: `fadeSlideUp 0.35s ease ${i * 60}ms both` }}>
                      <FriendRecipeCard
                        recipe={recipe}
                        onTap={() => router.push(`/recipes/${recipe.id}`)}
                        onSave={() => handleSaveFriendRecipe(recipe)}
                        onAddToMealPlan={onAddToMealPlan ? () => onAddToMealPlan(recipe.id) : undefined}
                        onAddToCollection={onAddToCollection ? () => onAddToCollection(recipe.id) : undefined}
                        isSaving={savingIds.has(recipe.id)}
                        isSaved={savedIds.has(recipe.id)}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* Recently saved by friends */}
              {friendRecipes.some((r) => !r.is_planned) && (
                <>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-3">
                    📚 Recently saved by friends
                  </p>
                  {friendRecipes.filter((r) => !r.is_planned).map((recipe, i) => (
                    <div key={recipe.id} style={{ animation: `fadeSlideUp 0.35s ease ${(i + (friendRecipes.filter(r => r.is_planned).length)) * 60}ms both` }}>
                      <FriendRecipeCard
                        recipe={recipe}
                        onTap={() => router.push(`/recipes/${recipe.id}`)}
                        onSave={() => handleSaveFriendRecipe(recipe)}
                        onAddToMealPlan={onAddToMealPlan ? () => onAddToMealPlan(recipe.id) : undefined}
                        onAddToCollection={onAddToCollection ? () => onAddToCollection(recipe.id) : undefined}
                        isSaving={savingIds.has(recipe.id)}
                        isSaved={savedIds.has(recipe.id)}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Community feed (trending/popular) ─────────────────────── */}
      {feedMode === "community" && (
        <div className="animate-fade-slide-up">
          {trendingLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 skeleton-warm rounded-3xl" />)}
            </div>
          ) : trending.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <span className="text-4xl mb-3 block">🌎</span>
              <p className="text-base font-semibold text-gray-800 mb-1">Nothing trending yet</p>
              <p className="text-sm text-gray-400 max-w-[260px] mx-auto leading-relaxed">
                As more people use Marco, popular recipes will appear here
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                🔥 Popular right now
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {trending.map((recipe, i) => (
                  <div key={recipe.recipeId} style={{ animation: `cardPop 0.4s ease ${i * 50}ms both` }}>
                    <TrendingCard recipe={recipe} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Friend recipe card ─────────────────────────────────────────────────────

function FriendRecipeCard({
  recipe,
  onTap,
  onSave,
  onAddToMealPlan,
  onAddToCollection,
  isSaving,
  isSaved,
}: {
  recipe: FriendRecipe;
  onTap: () => void;
  onSave: () => void;
  onAddToMealPlan?: () => void;
  onAddToCollection?: () => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const emoji = MEAL_EMOJIS[recipe.meal_type] ?? "🍳";

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform cursor-pointer"
      onClick={onTap}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
          {recipe.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span className="text-2xl">{emoji}</span>
          )}
          {recipe.is_planned && (
            <div className="absolute top-1 left-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              COOKING
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{recipe.title}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {recipe.owner_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipe.owner_avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-[8px]">👤</span>
                </div>
              )}
              <span className="text-xs text-gray-500 truncate">
                {recipe.owner_name}
                {recipe.is_planned && recipe.next_planned_date && (
                  <span className="text-green-600 font-medium">{" · cooking "}{formatPlannedDate(recipe.next_planned_date)}</span>
                )}
                {!recipe.is_planned && (
                  <span className="text-gray-400"> · {timeAgo(recipe.created_at)}</span>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {totalTime > 0 && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {totalTime}m
              </span>
            )}
            {recipe.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center border-t border-gray-50 divide-x divide-gray-50">
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          disabled={isSaving || isSaved}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            isSaved ? "text-green-600 bg-green-50/50" : isSaving ? "text-gray-400" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50/50"
          }`}
        >
          {isSaved ? (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Saved</>
          ) : isSaving ? (
            <><div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />Saving…</>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Save</>
          )}
        </button>
        {onAddToCollection && (
          <button onClick={(e) => { e.stopPropagation(); onAddToCollection(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50/50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            Collect
          </button>
        )}
        {onAddToMealPlan && (
          <button onClick={(e) => { e.stopPropagation(); onAddToMealPlan(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50/50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Plan
          </button>
        )}
      </div>
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
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          {recipe.userCount > 1 && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">{recipe.userCount} saves</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center relative">
          <span className="text-2xl">{recipe.meal_type === "breakfast" ? "🌅" : recipe.meal_type === "lunch" ? "☀️" : recipe.meal_type === "snack" ? "🍎" : "🍽️"}</span>
          {recipe.userCount > 1 && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">{recipe.userCount} saves</span>
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <h4 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2 mb-1">{recipe.title}</h4>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          {totalTime > 0 && <span>{totalTime}m</span>}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
        </div>
      </div>
    </a>
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
      {/* Image */}
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

      {/* Expandable details */}
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

      {/* Actions */}
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
