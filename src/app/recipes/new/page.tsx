"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  const isExtracted = searchParams.get("mode") === "extracted";
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
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
      }
    } catch {
      // sessionStorage unavailable or data corrupted
    }
  }, [isExtracted]);

  // Arrived via ImportRecipeSheet photo flow — show spinner while sessionStorage hydrates
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
