"use client";

import { useState } from "react";
import RecipeForm from "@/components/recipes/RecipeForm";
import CookbookPhotoUpload from "@/components/recipes/CookbookPhotoUpload";
import type { Ingredient } from "@/types";

type InputMode = "url" | "photo";

interface ExtractedRecipe {
  title?: string;
  description?: string;
  ingredients?: Ingredient[];
  steps?: string[];
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  tags?: string[];
}

export default function NewRecipePage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [extractedFromPhoto, setExtractedFromPhoto] = useState<ExtractedRecipe | null>(null);

  function handlePhotoExtracted(recipe: ExtractedRecipe) {
    setExtractedFromPhoto(recipe);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Save a Recipe</h1>

      {/* Mode toggle */}
      {!extractedFromPhoto && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-6 max-w-xs">
          <button
            onClick={() => setMode("url")}
            className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-colors ${
              mode === "url"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            From URL
          </button>
          <button
            onClick={() => setMode("photo")}
            className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-colors ${
              mode === "photo"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            From Photo
          </button>
        </div>
      )}

      {mode === "url" && !extractedFromPhoto && <RecipeForm />}

      {mode === "photo" && !extractedFromPhoto && (
        <div className="max-w-2xl mx-auto">
          <CookbookPhotoUpload onExtracted={handlePhotoExtracted} />
        </div>
      )}

      {extractedFromPhoto && (
        <RecipeForm
          recipe={{
            id: "",
            user_id: "",
            title: extractedFromPhoto.title || "",
            description: extractedFromPhoto.description || null,
            ingredients: extractedFromPhoto.ingredients || [],
            steps: extractedFromPhoto.steps || [],
            servings: extractedFromPhoto.servings || null,
            prep_time_minutes: extractedFromPhoto.prep_time_minutes || null,
            cook_time_minutes: extractedFromPhoto.cook_time_minutes || null,
            tags: extractedFromPhoto.tags || [],
            source_url: null,
            source_platform: null,
            image_url: null,
            notes: null,
            created_at: "",
            updated_at: "",
          }}
          onCancel={() => setExtractedFromPhoto(null)}
        />
      )}
    </div>
  );
}
