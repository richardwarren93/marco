"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function AddMealModal({
  isOpen,
  date,
  mealType: initialMealType,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  date: string;
  mealType: string;
  onClose: () => void;
  onAdd: (recipeId: string, date: string, mealType: string) => void;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [mealType, setMealType] = useState(initialMealType);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;
    setMealType(initialMealType);
    setSearch("");
    async function fetchRecipes() {
      setLoading(true);
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setRecipes((data as Recipe[]) || []);
      setLoading(false);
    }
    fetchRecipes();
  }, [isOpen, supabase, initialMealType]);

  if (!isOpen) return null;

  const filtered = search
    ? recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : recipes;

  const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Add to Plan</h3>
            <p className="text-xs text-gray-500">{dayLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ×
          </button>
        </div>

        {/* Meal type pills */}
        <div className="flex gap-1.5 px-4 py-2 border-b border-gray-50">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => setMealType(mt)}
              className={`text-xs px-3 py-1 rounded-full font-medium capitalize transition-colors ${
                mealType === mt
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {mt}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your recipes..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading recipes...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {search ? "No matching recipes" : "No saved recipes yet"}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => {
                    onAdd(recipe.id, date, mealType);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-orange-50 transition-colors group"
                >
                  <p className="text-sm font-medium text-gray-800 group-hover:text-orange-700 line-clamp-1">
                    {recipe.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {recipe.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-gray-400"
                      >
                        #{tag}
                      </span>
                    ))}
                    {recipe.prep_time_minutes && (
                      <span className="text-[10px] text-gray-400">
                        {recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
