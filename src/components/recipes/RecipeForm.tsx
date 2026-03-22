"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Ingredient, Recipe } from "@/types";

export default function RecipeForm({
  recipe,
  onCancel,
  onSaved,
}: {
  recipe?: Recipe;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState(!!recipe);

  const [title, setTitle] = useState(recipe?.title || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    (recipe?.ingredients as Ingredient[]) || []
  );
  const [steps, setSteps] = useState<string[]>(
    (recipe?.steps as string[]) || []
  );
  const [servings, setServings] = useState(
    recipe?.servings?.toString() || ""
  );
  const [prepTime, setPrepTime] = useState(
    recipe?.prep_time_minutes?.toString() || ""
  );
  const [cookTime, setCookTime] = useState(
    recipe?.cook_time_minutes?.toString() || ""
  );
  const [sourceUrl, setSourceUrl] = useState(recipe?.source_url || "");
  const [sourcePlatform, setSourcePlatform] = useState<string>(
    recipe?.source_platform || ""
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    recipe?.image_url || null
  );
  const [notes, setNotes] = useState(recipe?.notes || "");

  const router = useRouter();
  const supabase = createClient();

  const isEditing = !!recipe?.id;

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setExtracting(true);

    try {
      const resp = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      const r = data.recipe;
      setTitle(r.title || "");
      setDescription(r.description || "");
      setIngredients(r.ingredients || []);
      setSteps(r.steps || []);
      setServings(r.servings?.toString() || "");
      setPrepTime(r.prep_time_minutes?.toString() || "");
      setCookTime(r.cook_time_minutes?.toString() || "");
      setSourceUrl(r.source_url || url);
      setSourcePlatform(r.source_platform || "other");
      setImageUrl(r.image_url || null);
      setExtracted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const payload = {
        title,
        description: description || null,
        ingredients,
        steps,
        servings: servings ? parseInt(servings) : null,
        prep_time_minutes: prepTime ? parseInt(prepTime) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime) : null,
        tags: [],
        source_url: sourceUrl || null,
        source_platform: sourcePlatform || null,
        image_url: imageUrl || null,
        notes: notes || null,
      };

      let resp: Response;
      if (isEditing) {
        resp = await fetch("/api/recipes/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: recipe!.id, ...payload }),
        });
      } else {
        resp = await fetch("/api/recipes/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      if (onSaved) {
        onSaved();
      } else {
        router.push("/recipes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  function updateIngredient(
    index: number,
    field: keyof Ingredient,
    value: string
  ) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function addIngredient() {
    setIngredients([...ingredients, { name: "", amount: "", unit: "" }]);
  }

  function updateStep(index: number, value: string) {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function addStep() {
    setSteps([...steps, ""]);
  }

  function handleBack() {
    if (onCancel) {
      onCancel();
    } else {
      setExtracted(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {!extracted ? (
        <form onSubmit={handleExtract} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste a recipe link
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://www.instagram.com/p/... or https://www.tiktok.com/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={extracting}
            className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
          >
            {extracting ? "Extracting recipe..." : "Extract Recipe"}
          </button>

          {extracting && (
            <p className="text-sm text-gray-500 text-center">
              Scraping the page and analyzing with AI. This may take a few
              seconds...
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {imageUrl && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={title || "Recipe preview"}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servings
              </label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prep (min)
              </label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cook (min)
              </label>
              <input
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Ingredients
              </label>
              <button
                type="button"
                onClick={addIngredient}
                className="text-sm text-orange-600 hover:underline"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    placeholder="Amount"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    placeholder="Unit"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, "name", e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Steps</label>
              <button
                type="button"
                onClick={addStep}
                className="text-sm text-orange-600 hover:underline"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-sm text-gray-400 mt-2 w-6">
                    {i + 1}.
                  </span>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    rows={2}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-red-400 hover:text-red-600 text-sm mt-2"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Personal notes, tips, modifications..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title}
              className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
            >
              {saving ? "Saving..." : isEditing ? "Update Recipe" : "Save Recipe"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
