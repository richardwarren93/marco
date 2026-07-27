"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RecipeForm from "@/components/recipes/RecipeForm";
import ExtractBackButton from "@/components/recipes/ExtractBackButton";
import { PENDING_KEY } from "@/components/native/DeepLinkHandler";
import type { Ingredient } from "@/types";

const SAFE_TOP = { paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" } as const;

interface ExtractedRecipe {
  title?: string;
  description?: string;
  ingredients?: Ingredient[];
  steps?: string[];
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  tags?: string[];
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
  image_url?: string | null;
}

export default function NewRecipePage() {
  return (
    <Suspense>
      <NewRecipeInner />
    </Suspense>
  );
}

function NewRecipeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode");
  const isExtracted = mode === "extracted";
  const isTextMode = mode === "text";
  // Handed in by the iOS Share Extension via marco://import?url=… (see
  // DeepLinkHandler). Only http(s) survives — the param lands in a fetch body
  // and we don't want to forward anything else.
  const sharedUrl = (() => {
    const raw = searchParams.get("url");
    if (!raw) return undefined;
    try {
      const parsed = new URL(raw);
      return parsed.protocol === "http:" || parsed.protocol === "https:"
        ? parsed.toString()
        : undefined;
    } catch {
      return undefined;
    }
  })();
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  // Tracks whether we've already determined what to render. Prevents a
  // permanent spinner if the user back-navigates here after the recipe has
  // been saved (sessionStorage was already consumed).
  const [hydrated, setHydrated] = useState(false);

  // Pick up the pre-extracted recipe that ImportRecipeSheet/BottomTabBar placed
  // in sessionStorage. Reading sessionStorage is idempotent and cheap; we don't
  // need a ref guard. The previous `didRestoreRef` guard caused a perma-spinner
  // on iOS bfcache restore — the ref persisted true while sessionStorage was
  // empty, so the effect short-circuited and never triggered the redirect.
  useEffect(() => {
    if (!isExtracted) {
      setHydrated(true);
      return;
    }

    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem("importedRecipe");
      if (stored) sessionStorage.removeItem("importedRecipe");
    } catch {
      // sessionStorage unavailable
    }

    if (stored) {
      try {
        setExtractedRecipe(JSON.parse(stored));
        setHydrated(true);
        return;
      } catch {
        // Corrupted payload — fall through to redirect
      }
    }

    // No payload to restore — back-nav return after the recipe was already
    // saved. Bounce them to /recipes immediately. We use replace so this
    // dead URL doesn't accumulate in history.
    router.replace("/recipes");
    // Mark hydrated so the fallback UI renders if navigation is delayed
    // (e.g., bfcache, slow router) — gives the user a tap target instead
    // of a perma-spinner.
    setHydrated(true);
  }, [isExtracted, router]);

  // Consume the pending-import handoff as soon as we've got the URL in hand.
  // Leaving it in localStorage would make DeepLinkHandler re-push this page
  // the next time the user navigates anywhere.
  useEffect(() => {
    if (!sharedUrl) return;
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  }, [sharedUrl]);

  // iOS Safari bfcache: when the user uses the back gesture, the page may be
  // restored from the back-forward cache without any React lifecycle running.
  // Detect that case and re-run the redirect / state check.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return; // not a bfcache restore
      if (isExtracted && !extractedRecipe) {
        router.replace("/recipes");
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [isExtracted, extractedRecipe, router]);

  async function handleTextExtract() {
    if (!pastedText.trim()) return;
    setExtracting(true);
    setExtractError("");
    try {
      const res = await fetch("/api/recipes/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract recipe");
      try { sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe)); } catch {}
      router.push("/recipes/new?mode=extracted");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Failed to extract recipe. Please try again.");
      setExtracting(false);
    }
  }

  // Text paste mode — show text input inline
  if (isTextMode && !extractedRecipe) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-6" style={SAFE_TOP}>
        <ExtractBackButton />
        <h1 className="text-xl font-bold text-gray-900 mb-1">Paste a recipe</h1>
        <p className="text-sm text-gray-500 mb-5">Paste any recipe text and we&apos;ll extract it automatically.</p>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste recipe text here…"
          rows={10}
          className="w-full border border-gray-200 rounded-2xl p-4 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/40"
        />
        {extractError && <p className="text-sm text-red-500 mt-2">{extractError}</p>}
        <button
          onClick={handleTextExtract}
          disabled={extracting || !pastedText.trim()}
          className="mt-4 w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: "#E5462E" }}
        >
          {extracting ? "Extracting…" : "Extract Recipe"}
        </button>
      </div>
    );
  }

  // Arrived via photo flow — show spinner while sessionStorage hydrates.
  // Once hydration has run and we still have no recipe, the redirect to
  // /recipes is already in flight; render an actionable fallback instead of
  // a bare spinner so the user always has a way out.
  if (isExtracted && !extractedRecipe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4 py-16 text-gray-500">
          {!hydrated ? (
            <>
              <div className="w-10 h-10 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading your recipe…</p>
            </>
          ) : (
            <>
              <p className="text-sm">Recipe was already saved.</p>
              <button
                onClick={() => router.replace("/recipes")}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: "#E5462E" }}
              >
                Back to recipes
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-6" style={SAFE_TOP}>
      {extractedRecipe ? (
        <RecipeForm
          recipe={{
            id: "",
            user_id: "",
            title: extractedRecipe.title || "",
            description: extractedRecipe.description || null,
            ingredients: extractedRecipe.ingredients || [],
            steps: extractedRecipe.steps || [],
            servings: extractedRecipe.servings || null,
            prep_time_minutes: extractedRecipe.prep_time_minutes || null,
            cook_time_minutes: extractedRecipe.cook_time_minutes || null,
            tags: extractedRecipe.tags || [],
            meal_type: extractedRecipe.meal_type || "dinner",
            source_url: null,
            source_platform: null,
            image_url: extractedRecipe.image_url || null,
            notes: null,
            created_at: "",
            updated_at: "",
          }}
          onCancel={() => setExtractedRecipe(null)}
        />
      ) : (
        <RecipeForm initialUrl={sharedUrl} />
      )}
    </div>
  );
}
