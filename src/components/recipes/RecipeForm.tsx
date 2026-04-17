"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Ingredient, Recipe } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { GENERIC_UNITS } from "@/data/ingredients";
import { scrollIntoViewAboveKeyboard } from "@/lib/keyboard-scroll";

type Step = "url" | "extracting" | "preview" | "editing" | "saving";

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
  const [error, setError] = useState("");
  const [duplicateRecipeId, setDuplicateRecipeId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(recipe ? "editing" : "url");
  const { showToast } = useToast();

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
  const [tags, setTags] = useState(recipe?.tags?.join(", ") || "");
  const [sourceUrl, setSourceUrl] = useState(recipe?.source_url || "");
  const [sourcePlatform, setSourcePlatform] = useState<string>(
    recipe?.source_platform || ""
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    recipe?.image_url || null
  );
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    recipe?.meal_type || "dinner"
  );
  const [notes, setNotes] = useState(recipe?.notes || "");

  const router = useRouter();
  const isEditing = !!recipe?.id;

  // ─── Extract ────────────────────────────────────────────────────────────────
  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("extracting");

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
      setTags((r.tags || []).join(", "));
      setSourceUrl(r.source_url || url);
      setSourcePlatform(r.source_platform || "other");
      setImageUrl(r.image_url || null);
      if (r.meal_type) setMealType(r.meal_type);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setStep("url");
    }
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    setStep("saving");
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
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        meal_type: mealType,
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
      if (!resp.ok) {
        if (data.duplicate && data.recipeId) {
          setDuplicateRecipeId(data.recipeId);
        }
        throw new Error(data.error);
      }

      const recipeId = data.recipe?.id;
      showToast(isEditing ? "Recipe updated!" : "Recipe saved!", {
        variant: "success",
        ...(!isEditing && recipeId ? {
          action: {
            label: "Add to meal plan",
            onClick: () => router.push(`/recipes/${recipeId}?openMealSheet=true`),
          },
        } : {}),
      });
      if (onSaved) {
        onSaved();
      } else if (recipeId) {
        router.push(`/recipes/${recipeId}`);
      } else {
        router.push("/recipes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setStep("preview");
    }
  }

  // ─── Ingredient / Step helpers ──────────────────────────────────────────────
  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
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

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Step: URL Input ──────────────────────────────────────────────── */}
      {step === "url" && (
        <form onSubmit={handleExtract} className="space-y-5 animate-slide-up">
          <div className="text-center space-y-2 py-4">
            <div className="text-4xl">🔗</div>
            <p className="text-sm text-gray-500">
              Paste a link and we'll do the rest
            </p>
          </div>

          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="Paste recipe URL..."
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-300 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-all text-sm"
            />
            <div className="flex items-center gap-2 mt-2.5 px-1 text-[11px] text-gray-400">
              <span className="font-medium">Works with:</span>
              {[
                { name: "Instagram", color: "text-pink-500" },
                { name: "TikTok", color: "text-gray-600" },
                { name: "NYT Cooking", color: "text-gray-600" },
                { name: "Bon Appetit", color: "text-amber-600" },
                { name: "& more", color: "text-gray-400" },
              ].map((p) => (
                <span key={p.name} className={`${p.color} font-medium`}>{p.name}</span>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
              {error}
              {duplicateRecipeId && (
                <Link href={`/recipes/${duplicateRecipeId}`} className="block mt-1 text-orange-600 font-medium hover:underline">
                  View saved recipe →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!url.trim()}
            className="w-full py-3.5 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40 font-semibold text-sm transition-all"
          >
            Extract Recipe
          </button>
        </form>
      )}

      {/* ── Step: Extracting ─────────────────────────────────────────────── */}
      {step === "extracting" && <ExtractingAnimation />}

      {/* ── Step: Preview Card ───────────────────────────────────────────── */}
      {(step === "preview" || step === "saving") && (
        <div className="space-y-4 animate-slide-up">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
              {error}
              {duplicateRecipeId && (
                <Link href={`/recipes/${duplicateRecipeId}`} className="block mt-1 text-orange-600 font-medium hover:underline">
                  View saved recipe →
                </Link>
              )}
            </div>
          )}

          {/* Hero card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {imageUrl && (
              <div className="relative h-52 bg-gray-100">
                <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            )}
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg font-bold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-orange-300 transition-colors pb-1"
                placeholder="Recipe title"
              />

              {/* Meal type pills */}
              <div className="flex gap-1.5">
                {(["breakfast", "lunch", "dinner", "snack"] as const).map((mt) => {
                  const icons = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };
                  return (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setMealType(mt)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                        mealType === mt
                          ? "bg-orange-500 text-white scale-105"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {icons[mt]} {mt}
                    </button>
                  );
                })}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                {servings && (
                  <span className="flex items-center gap-1">
                    <span className="text-base">👤</span> {servings} servings
                  </span>
                )}
                {prepTime && (
                  <span className="flex items-center gap-1">
                    <span className="text-base">⏱️</span> {prepTime}m prep
                  </span>
                )}
                {cookTime && (
                  <span className="flex items-center gap-1">
                    <span className="text-base">🔥</span> {cookTime}m cook
                  </span>
                )}
              </div>

              {/* Tags */}
              {tags && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[11px] font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Ingredients summary */}
              <div className="pt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  {ingredients.length} Ingredients
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {ingredients.slice(0, 6).map((ing) => ing.name).join(", ")}
                  {ingredients.length > 6 && ` +${ingredients.length - 6} more`}
                </p>
              </div>

              {/* Steps summary */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  {steps.length} Steps
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {steps[0]}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleSave}
              disabled={step === "saving" || !title}
              className="w-full py-3.5 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              {step === "saving" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save Recipe</>
              )}
            </button>
            <button
              onClick={() => setStep("editing")}
              disabled={step === "saving"}
              className="w-full py-3 text-gray-500 text-sm font-medium hover:text-orange-600 transition-colors"
            >
              Edit details
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Edit Details ───────────────────────────────────────────── */}
      {step === "editing" && (
        <div className="space-y-5 animate-slide-up">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
              {error}
              {duplicateRecipeId && (
                <Link href={`/recipes/${duplicateRecipeId}`} className="block mt-1 text-orange-600 font-medium hover:underline">
                  View saved recipe →
                </Link>
              )}
            </div>
          )}

          {/* Compact image + title header */}
          <div className="flex items-center gap-3">
            {imageUrl && (
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                <Image src={imageUrl} alt={title} fill className="object-cover" sizes="56px" />
              </div>
            )}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-lg font-bold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-orange-300 transition-colors"
              placeholder="Recipe title"
            />
          </div>

          {/* Meal type */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Meal Type
            </label>
            <div className="flex gap-1.5">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((mt) => {
                const icons = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };
                return (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setMealType(mt)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                      mealType === mt
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {icons[mt]} {mt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Servings", value: servings, setter: setServings },
              { label: "Prep (min)", value: prepTime, setter: setPrepTime },
              { label: "Cook (min)", value: cookTime, setter: setCookTime },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  {field.label}
                </label>
                <input
                  type="number"
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50 focus:bg-white transition-all"
                />
              </div>
            ))}
          </div>

          {/* Ingredients */}
          <EditSection
            title="Ingredients"
            count={ingredients.length}
            onAdd={addIngredient}
          >
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input
                    placeholder="Amt"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50"
                  />
                  <input
                    placeholder="Unit"
                    list="unit-options"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50"
                  />
                  <input
                    placeholder="Ingredient"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, "name", e.target.value)}
                    className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </EditSection>

          {/* Unit suggestions datalist */}
          <datalist id="unit-options">
            {GENERIC_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>

          {/* Steps */}
          <EditSection
            title="Steps"
            count={steps.length}
            onAdd={addStep}
          >
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs font-bold text-orange-400 mt-2.5 w-5 text-right flex-shrink-0">
                    {i + 1}
                  </span>
                  <textarea
                    value={s}
                    onChange={(e) => updateStep(i, e.target.value)}
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 mt-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </EditSection>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onFocus={(e) => scrollIntoViewAboveKeyboard(e.target)}
              placeholder="e.g. vegan, quick, dessert"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={(e) => scrollIntoViewAboveKeyboard(e.target)}
              rows={2}
              placeholder="Personal notes, tips..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              onClick={() => { setError(""); setStep("preview"); }}
              className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={!title}
              className="flex-1 py-3 bg-orange-500 text-white rounded-2xl text-sm font-semibold hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40 transition-all"
            >
              {isEditing ? "Update" : "Save Recipe"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom padding so the keyboard scroll has room to push content above it */}
      <div style={{ height: "60vh" }} aria-hidden />
    </div>
  );
}

// ─── Edit Section component ──────────────────────────────────────────────────
function EditSection({
  title,
  count,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title} <span className="text-gray-300">({count})</span>
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
        >
          + Add
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── Extracting animation ────────────────────────────────────────────────────
function ExtractingAnimation() {
  const [dots, setDots] = useState(0);
  const [phase, setPhase] = useState(0);

  const phases = [
    { icon: "🌐", text: "Fetching recipe page" },
    { icon: "🔍", text: "Analyzing ingredients" },
    { icon: "📝", text: "Extracting steps" },
    { icon: "✨", text: "Polishing details" },
  ];

  useEffect(() => {
    const dotTimer = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    const phaseTimer = setInterval(() => setPhase((p) => Math.min(p + 1, phases.length - 1)), 2200);
    return () => {
      clearInterval(dotTimer);
      clearInterval(phaseTimer);
    };
  }, []);

  const current = phases[phase];

  return (
    <div className="flex flex-col items-center py-16 space-y-6 animate-slide-up">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center">
          <span className="text-3xl" key={phase} style={{ animation: "pop-in 0.3s ease-out" }}>
            {current.icon}
          </span>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-orange-300 border-t-transparent animate-spin" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-gray-700">
          {current.text}{".".repeat(dots)}
        </p>
        <p className="text-xs text-gray-400">
          This usually takes 5-10 seconds
        </p>
      </div>
      {/* Progress dots */}
      <div className="flex gap-2">
        {phases.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= phase ? "bg-orange-400 w-6" : "bg-gray-200 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

