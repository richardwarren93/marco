"use client";

import { useEffect, useState, useCallback } from "react";
import type { RecipeNutrition } from "@/types";

interface Props {
  recipeId: string;
  ratio?: number; // servings ratio for scaling
}

export default function NutritionCard({ recipeId, ratio = 1 }: Props) {
  const [nutrition, setNutrition] = useState<RecipeNutrition | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  const fetchNutrition = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/nutrition`);
      if (res.ok) {
        const data = await res.json();
        setNutrition(data.nutrition);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchNutrition();
  }, [fetchNutrition]);

  async function handleEstimate() {
    setEstimating(true);
    setError("");
    try {
      const res = await fetch(`/api/recipes/${recipeId}/nutrition`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to estimate");
      }
      const data = await res.json();
      setNutrition(data.nutrition);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to estimate nutrition");
    } finally {
      setEstimating(false);
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-8 bg-gray-50 rounded-full animate-pulse" />
      </div>
    );
  }

  // Not yet estimated — CTA
  if (!nutrition) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥗</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Nutrition</p>
              <p className="text-xs text-gray-500">AI-estimated macros</p>
            </div>
          </div>
          <button
            onClick={handleEstimate}
            disabled={estimating}
            className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-full hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {estimating ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Estimating...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Estimate
              </>
            )}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  // Scale values by serving ratio
  const cal = Math.round((nutrition.calories || 0) * ratio);
  const protein = Math.round((nutrition.protein_g || 0) * ratio * 10) / 10;
  const carbs = Math.round((nutrition.carbs_g || 0) * ratio * 10) / 10;
  const fat = Math.round((nutrition.fat_g || 0) * ratio * 10) / 10;
  const fiber = Math.round((nutrition.fiber_g || 0) * ratio * 10) / 10;
  const sugar = Math.round((nutrition.sugar_g || 0) * ratio * 10) / 10;
  const sodium = Math.round((nutrition.sodium_mg || 0) * ratio);

  // Macro proportions for the bar
  const totalMacroG = protein + carbs + fat;
  const proteinPct = totalMacroG > 0 ? (protein / totalMacroG) * 100 : 33;
  const carbsPct = totalMacroG > 0 ? (carbs / totalMacroG) * 100 : 33;
  const fatPct = totalMacroG > 0 ? (fat / totalMacroG) * 100 : 34;

  const confidenceConfig = {
    high: { color: "bg-green-500", text: "text-green-700", label: "High confidence" },
    medium: { color: "bg-amber-500", text: "text-amber-700", label: "Medium confidence" },
    low: { color: "bg-red-400", text: "text-red-600", label: "Low confidence" },
  };
  const conf = confidenceConfig[nutrition.confidence || "medium"];

  const scaled = ratio !== 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🥗</span>
          <h3 className="text-sm font-bold text-gray-900">Nutrition</h3>
          {scaled && (
            <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
              Scaled
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${conf.color}`} />
            <span className={`text-[10px] font-medium ${conf.text}`}>{conf.label}</span>
          </div>
          <button
            onClick={handleEstimate}
            disabled={estimating}
            className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
            title="Refresh estimate"
          >
            <svg className={`w-3 h-3 text-gray-400 ${estimating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {/* Macro bar */}
      <div className="mx-4 h-2.5 rounded-full overflow-hidden flex bg-gray-100">
        <div
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${proteinPct}%` }}
          title={`Protein: ${proteinPct.toFixed(0)}%`}
        />
        <div
          className="bg-blue-400 transition-all duration-500"
          style={{ width: `${carbsPct}%` }}
          title={`Carbs: ${carbsPct.toFixed(0)}%`}
        />
        <div
          className="bg-amber-400 transition-all duration-500"
          style={{ width: `${fatPct}%` }}
          title={`Fat: ${fatPct.toFixed(0)}%`}
        />
      </div>

      {/* Legend dots */}
      <div className="flex items-center justify-center gap-4 mt-1.5 px-4">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Protein
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Carbs
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Fat
        </span>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-4 gap-1 px-4 py-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 tabular-nums">{cal}</p>
          <p className="text-[10px] text-gray-500 font-medium">Calories</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600 tabular-nums">{protein}g</p>
          <p className="text-[10px] text-gray-500 font-medium">Protein</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-500 tabular-nums">{carbs}g</p>
          <p className="text-[10px] text-gray-500 font-medium">Carbs</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-500 tabular-nums">{fat}g</p>
          <p className="text-[10px] text-gray-500 font-medium">Fat</p>
        </div>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 border-t border-gray-100 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {expanded ? "Less details" : "More details"}
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 animate-slide-up">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-sm font-bold text-gray-800 tabular-nums">{fiber}g</p>
              <p className="text-[10px] text-gray-500">Fiber</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-sm font-bold text-gray-800 tabular-nums">{sugar}g</p>
              <p className="text-[10px] text-gray-500">Sugar</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-sm font-bold text-gray-800 tabular-nums">{sodium}mg</p>
              <p className="text-[10px] text-gray-500">Sodium</p>
            </div>
          </div>
          {nutrition.notes && (
            <p className="text-[11px] text-gray-400 italic leading-relaxed mt-2">
              {nutrition.notes}
            </p>
          )}
          <p className="text-[10px] text-gray-300 mt-1">
            Per serving - AI estimated
          </p>
        </div>
      )}
    </div>
  );
}
