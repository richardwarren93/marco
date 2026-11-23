"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Ingredient, Recipe } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { GENERIC_UNITS } from "@/data/ingredients";
import { scrollIntoViewAboveKeyboard } from "@/lib/keyboard-scroll";
import { MealTypeIcon } from "@/components/icons/MealIcons";
import { ClockIcon, CookingPotIcon, ProfileIcon } from "@/components/icons/HandDrawnIcons";
import ExtractBackButton from "@/components/recipes/ExtractBackButton";
import { CREAM_WARM, DISPLAY, INK, INK_MUTED, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

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
          <ExtractBackButton onClick={onCancel ?? (() => router.back())} />
          <div className="text-center space-y-3 py-2">
            <p
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontStyle: "italic",
                fontVariationSettings: '"opsz" 30, "SOFT" 100, "wght" 400',
                fontSize: "20px",
                color: "var(--ink, #171410)",
                lineHeight: 1.3,
              }}
            >
              Paste a link, we'll do the rest.
            </p>
          </div>

          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="Paste recipe URL…"
              className="w-full px-4 py-3.5 outline-none transition-all text-sm"
              style={{
                background: CREAM_WARM,
                color: INK,
                border: `2.5px solid ${INK}`,
                borderRadius: 14,
                boxShadow: `3px 4px 0 ${INK}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = PAPER;
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = CREAM_WARM;
              }}
            />
            <div
              className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2.5 px-1"
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-soft, #4A4742)",
                opacity: 0.7,
              }}
            >
              <span>Works with</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Instagram</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>TikTok</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>NYT Cooking</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Bon Appétit</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>& more</span>
            </div>
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm"
              style={{
                background: "rgba(229, 70, 46, 0.08)",
                color: "var(--tomato-dark, #B8331E)",
              }}
            >
              {error}
              {duplicateRecipeId && (
                <Link
                  href={`/recipes/${duplicateRecipeId}`}
                  className="block mt-1 font-semibold hover:underline"
                  style={{ color: "var(--tomato, #E5462E)" }}
                >
                  View saved recipe →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!url.trim()}
            className="w-full py-3.5 active:scale-[0.98] disabled:opacity-40 text-sm transition-transform"
            style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 14, boxShadow: `4px 4px 0 ${INK}` }}
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
            <div
              className="p-3 rounded-xl text-sm"
              style={{
                background: "rgba(229, 70, 46, 0.08)",
                color: "var(--tomato-dark, #B8331E)",
              }}
            >
              {error}
              {duplicateRecipeId && (
                <Link
                  href={`/recipes/${duplicateRecipeId}`}
                  className="block mt-1 font-semibold hover:underline"
                  style={{ color: "var(--tomato, #E5462E)" }}
                >
                  View saved recipe →
                </Link>
              )}
            </div>
          )}

          {/* Hero card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#ffffff",
              border: "1px solid var(--line, rgba(28,26,23,0.12))",
              boxShadow: "0 2px 16px rgba(20,12,5,0.06)",
            }}
          >
            {imageUrl && (
              <div className="relative h-52" style={{ background: "var(--cream-warm, #EFE5D2)" }}>
                <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            )}
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent outline-none border-b transition-colors pb-1"
                style={{
                  fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                  fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500',
                  fontSize: "22px",
                  letterSpacing: "-0.015em",
                  color: "var(--ink, #171410)",
                  borderColor: "transparent",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--tomato, #E5462E)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
                placeholder="Recipe title"
              />

              {/* Meal type pills */}
              <div className="flex flex-wrap gap-1.5">
                {(["breakfast", "lunch", "dinner", "snack"] as const).map((mt) => {
                  const isActive = mealType === mt;
                  return (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setMealType(mt)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs capitalize active:scale-95 transition-transform"
                      style={{
                        background: isActive ? TOMATO : PAPER,
                        color: isActive ? PAPER : INK,
                        fontFamily: DISPLAY,
                        fontWeight: 700,
                        border: `2px solid ${INK}`,
                        borderRadius: 99,
                        boxShadow: isActive ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}`,
                        transform: isActive ? "translate(1px, 1px)" : undefined,
                      }}
                    >
                      <MealTypeIcon type={mt} className="w-3.5 h-3.5" strokeWidth={1.8} />
                      {mt}
                    </button>
                  );
                })}
              </div>

              {/* Stats row */}
              <div
                className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-1 text-xs"
                style={{ color: "var(--ink-soft, #4A4742)" }}
              >
                {servings && (
                  <span className="flex items-center gap-1.5">
                    <ProfileIcon className="w-3.5 h-3.5" /> {servings} servings
                  </span>
                )}
                {prepTime && (
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5" /> {prepTime}m prep
                  </span>
                )}
                {cookTime && (
                  <span className="flex items-center gap-1.5">
                    <CookingPotIcon className="w-3.5 h-3.5" /> {cookTime}m cook
                  </span>
                )}
                {ingredients.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    {/* Bullet list — ingredients */}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                      <circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="5" cy="18" r="1.2" fill="currentColor" stroke="none" />
                      <path d="M10 6h10M10 12h10M10 18h7" />
                    </svg>
                    {ingredients.length} ingredient{ingredients.length === 1 ? "" : "s"}
                  </span>
                )}
                {steps.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    {/* Numbered list — steps */}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                      <text x="2" y="8.5" fontFamily="ui-monospace, 'Geist Mono', monospace" fontSize="6.5" fontWeight="600" fill="currentColor" stroke="none">1</text>
                      <text x="2" y="14.5" fontFamily="ui-monospace, 'Geist Mono', monospace" fontSize="6.5" fontWeight="600" fill="currentColor" stroke="none">2</text>
                      <text x="2" y="20.5" fontFamily="ui-monospace, 'Geist Mono', monospace" fontSize="6.5" fontWeight="600" fill="currentColor" stroke="none">3</text>
                      <path d="M10 7h10M10 13h10M10 19h7" />
                    </svg>
                    {steps.length} step{steps.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {/* Tags */}
              {tags && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        background: "var(--cream-warm, #EFE5D2)",
                        color: "var(--ink-soft, #4A4742)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleSave}
              disabled={step === "saving" || !title}
              className="w-full py-3.5 active:scale-[0.98] disabled:opacity-50 text-sm transition-transform flex items-center justify-center gap-2"
              style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 14, boxShadow: `4px 4px 0 ${INK}` }}
            >
              {step === "saving" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>Save Recipe</>
              )}
            </button>
            <button
              onClick={() => setStep("editing")}
              disabled={step === "saving"}
              className="w-full py-3 text-sm font-medium transition-colors"
              style={{ color: "var(--ink-soft, #4A4742)" }}
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
            <div className="p-3 text-sm" style={{ background: "rgba(229,70,46,0.12)", color: TOMATO_DARK, border: `2px solid ${INK}`, borderRadius: 12 }}>
              {error}
              {duplicateRecipeId && (
                <Link href={`/recipes/${duplicateRecipeId}`} className="block mt-1 font-semibold underline" style={{ color: TOMATO }}>
                  View saved recipe →
                </Link>
              )}
            </div>
          )}

          {/* Compact image + title header */}
          <div className="flex items-center gap-3">
            {imageUrl && (
              <div className="w-14 h-14 overflow-hidden flex-shrink-0 relative" style={{ background: CREAM_WARM, borderRadius: 12, border: `2px solid ${INK}` }}>
                <Image src={imageUrl} alt={title} fill className="object-cover" sizes="56px" />
              </div>
            )}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 bg-transparent outline-none transition-colors"
            style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, borderBottom: `2px solid ${INK}` }}
              placeholder="Recipe title"
            />
          </div>

          {/* Meal type */}
          <div>
            <label
              className="block mb-2"
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--ink-soft, #4A4742)",
                opacity: 0.7,
              }}
            >
              Meal Type
            </label>
            <div className="flex gap-1.5">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((mt) => {
                const isActive = mealType === mt;
                return (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setMealType(mt)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs capitalize active:scale-95 transition-transform"
                    style={{
                      background: isActive ? TOMATO : PAPER,
                      color: isActive ? PAPER : INK,
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      border: `2px solid ${INK}`,
                      borderRadius: 99,
                      boxShadow: isActive ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}`,
                      transform: isActive ? "translate(1px, 1px)" : undefined,
                    }}
                  >
                    <MealTypeIcon type={mt} className="w-3.5 h-3.5" strokeWidth={1.8} />
                    {mt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
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
                <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
                  {field.label}
                </label>
                <input
                  type="number"
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
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
                    className="w-16 px-2 py-2 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 9 }}
                  />
                  <input
                    placeholder="Unit"
                    list="unit-options"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                    className="w-20 px-2 py-2 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 9 }}
                  />
                  <input
                    placeholder="Ingredient"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, "name", e.target.value)}
                    className="flex-1 px-2 py-2 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 9 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-transform flex-shrink-0" style={{ color: INK_MUTED }}
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
                  <span className="text-xs mt-2.5 w-5 text-right flex-shrink-0" style={{ color: TOMATO, fontFamily: DISPLAY, fontWeight: 700 }}>
                    {i + 1}
                  </span>
                  <textarea
                    value={s}
                    onChange={(e) => updateStep(i, e.target.value)}
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 9 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-transform flex-shrink-0 mt-1" style={{ color: INK_MUTED }}
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
            <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onFocus={(e) => scrollIntoViewAboveKeyboard(e.target)}
              placeholder="e.g. vegan, quick, dessert"
              className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={(e) => scrollIntoViewAboveKeyboard(e.target)}
              rows={2}
              placeholder="Personal notes, tips..."
              className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              onClick={() => { setError(""); setStep("preview"); }}
              className="flex-1 py-3 text-sm active:scale-[0.98] transition-transform"
              style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 3px 0 ${INK}` }}
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={!title}
              className="flex-1 py-3 text-sm active:scale-[0.98] disabled:opacity-40 transition-transform"
              style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 3px 0 ${INK}` }}
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
        <label className="text-[10px] uppercase tracking-[0.16em]" style={{ color: INK_MUTED, fontWeight: 700 }}>
          {title} <span style={{ opacity: 0.6 }}>({count})</span>
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="text-[11px] px-2 py-0.5 active:scale-95 transition-transform"
          style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `1.5px solid ${INK}`, borderRadius: 99 }}
        >
          + Add
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── Extracting animation ────────────────────────────────────────────────────
// Marco-native loader: signature wordmark with a pulsing punctum (the brand's
// canonical motion), Fraunces italic phase copy, mono-tracked hint, tomato
// dots for progress. No emoji, no generic spinner.
function ExtractingAnimation() {
  const [phase, setPhase] = useState(0);

  const phases = [
    "Fetching the page",
    "Reading the ingredients",
    "Pulling out the steps",
    "Polishing the details",
  ];

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, phases.length - 1)), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center py-16 space-y-7 animate-slide-up">
      <span className="marco-signature is-pulsing" style={{ fontSize: "4.5rem" }}>Marco</span>

      <p
        key={phase}
        style={{
          fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
          fontStyle: "italic",
          fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
          fontSize: "20px",
          color: "var(--ink, #171410)",
          animation: "fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {phases[phase]}
      </p>

      <p className="marco-mono">Usually 5–10 sec</p>

      <div className="flex gap-2">
        {phases.map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
            style={{
              background: i <= phase ? "var(--tomato, #E5462E)" : "var(--line, rgba(28,26,23,0.12))",
            }}
          />
        ))}
      </div>
    </div>
  );
}

