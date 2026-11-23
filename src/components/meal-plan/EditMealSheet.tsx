"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { MealPlan, Recipe } from "@/types";
import { MealTypeIcon } from "@/components/icons/MealIcons";
import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LIME, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

export default function EditMealSheet({
  isOpen,
  plan,
  allRecipes,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  plan: MealPlan | null;
  allRecipes: Recipe[];
  onClose: () => void;
  onSave: (
    planId: string,
    updates: { meal_type?: string; recipe_id?: string; servings?: number }
  ) => Promise<void>;
}) {
  const [mealType, setMealType] = useState<MealType>("dinner");
  const [servings, setServings] = useState(1);
  const [recipeId, setRecipeId] = useState<string>("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan && isOpen) {
      setMealType(
        MEAL_TYPES.includes(plan.meal_type as MealType)
          ? (plan.meal_type as MealType)
          : "dinner"
      );
      setServings(plan.servings || 1);
      setRecipeId(plan.recipe_id || "");
      setRecipeSearch("");
    }
  }, [plan, isOpen]);

  const recipeResults = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    if (!q) return [];
    return allRecipes
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.tags || []).some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [recipeSearch, allRecipes]);

  const selectedRecipe = allRecipes.find((r) => r.id === recipeId);

  async function handleSave() {
    if (!plan) return;
    setSaving(true);
    try {
      await onSave(plan.id, { meal_type: mealType, recipe_id: recipeId || undefined, servings });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-h-[88vh] flex flex-col sm:max-w-lg" style={{ background: PAPER, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTop: `2.5px solid ${INK}`, borderLeft: `2.5px solid ${INK}`, borderRight: `2.5px solid ${INK}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: INK, opacity: 0.25 }} />
        </div>

        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `2.5px solid ${INK}` }}>
          <h3 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>Edit meal</h3>
          <Link
            href={`/recipes/${plan.recipe_id}`}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600"
            onClick={onClose}
          >
            View recipe →
          </Link>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Meal type */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: INK_MUTED, fontWeight: 700 }}>
              Meal type
            </p>
            <div className="flex gap-1.5">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt}
                  onClick={() => setMealType(mt)}
                  className={`flex-1 py-2 rounded-full text-xs font-semibold capitalize transition-colors ${
                    mealType === mt
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {mt}
                </button>
              ))}
            </div>
          </div>

          {/* Servings */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: INK_MUTED, fontWeight: 700 }}>
              Servings
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-xl active:scale-90 transition-transform" style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}` }}
              >
                −
              </button>
              <span className="w-6 text-center" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 21 }}>{servings}</span>
              <button
                onClick={() => setServings((s) => s + 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-xl active:scale-90 transition-transform" style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}` }}
              >
                +
              </button>
            </div>
          </div>

          {/* Recipe */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: INK_MUTED, fontWeight: 700 }}>
              Recipe
            </p>

            {/* Current selection */}
            {selectedRecipe && (
              <div className="flex items-center gap-3 p-3 mb-2" style={{ background: BUTTER, border: `2px solid ${INK}`, borderRadius: 12 }}>
                <div className="w-9 h-9 overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: PAPER, borderRadius: 9, border: `2px solid ${INK}` }}>
                  {selectedRecipe.image_url ? (
                    <div className="relative w-full h-full"><Image src={selectedRecipe.image_url} alt={selectedRecipe.title} fill className="object-cover" sizes="36px" /></div>
                  ) : (
                    <MealTypeIcon type={selectedRecipe.meal_type} className="w-4 h-4 opacity-60" strokeWidth={1.8} />
                  )}
                </div>
                <p className="text-sm font-semibold text-orange-800 flex-1 line-clamp-1">
                  {selectedRecipe.title}
                </p>
                <svg
                  className="w-4 h-4 text-orange-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Search to change */}
            <input
              type="text"
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
              placeholder="Search to change recipe…"
              className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
            />
            {recipeResults.length > 0 && (
              <div className="mt-1 overflow-hidden" style={{ background: PAPER, borderRadius: 12, border: `2px solid ${INK}` }}>
                {recipeResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRecipeId(r.id);
                      setRecipeSearch("");
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      r.id === recipeId ? "bg-orange-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      {r.image_url ? (
                        <div className="relative w-full h-full"><Image src={r.image_url} alt={r.title} fill className="object-cover" sizes="32px" /></div>
                      ) : (
                        <MealTypeIcon type={r.meal_type} className="w-4 h-4 opacity-60" strokeWidth={1.8} />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-800 line-clamp-1 flex-1">
                      {r.title}
                    </span>
                    {r.id === recipeId && (
                      <svg
                        className="w-4 h-4 text-orange-500 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
