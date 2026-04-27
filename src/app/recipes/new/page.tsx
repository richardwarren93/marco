"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RecipeForm from "@/components/recipes/RecipeForm";
import type { Ingredient } from "@/types";

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
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const didRestoreRef = useRef(false);

  // Pick up the pre-extracted recipe that ImportRecipeSheet placed in sessionStorage
  useEffect(() => {
    if (!isExtracted || didRestoreRef.current) return;
    didRestoreRef.current = true;
    try {
      const stored = sessionStorage.getItem("importedRecipe");
      if (stored) {
        sessionStorage.removeItem("importedRecipe");
        setExtractedRecipe(JSON.parse(stored));
        return;
      }
    } catch {
      // sessionStorage unavailable or data corrupted
    }
    // No payload to restore — likely a back-nav return after the recipe was
    // already saved (sessionStorage consumed). Don't strand the user on the
    // permanent "Loading your recipe…" spinner.
    router.replace("/recipes");
  }, [isExtracted, router]);

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
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back
        </button>
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
          style={{ background: "#ea580c" }}
        >
          {extracting ? "Extracting…" : "Extract Recipe"}
        </button>
      </div>
    );
  }

  // Arrived via photo flow — show spinner while sessionStorage hydrates
  if (isExtracted && !extractedRecipe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
          <div className="w-10 h-10 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading your recipe…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
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
        <RecipeForm />
      )}
    </div>
  );
}
