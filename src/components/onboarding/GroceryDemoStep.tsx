"use client";

import { useMemo, useState } from "react";
import { getMealPlanDemoRecipes } from "./data/sample-recipes";

interface Props {
  assignments: Record<string, string[]>;
  onNext: () => void;
}

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  protein: { emoji: "\u{1F969}", color: "#ef4444" },
  produce: { emoji: "\u{1F966}", color: "#22c55e" },
  dairy: { emoji: "\u{1F9C0}", color: "#f59e0b" },
  pantry: { emoji: "\u{1FAD8}", color: "#8b5cf6" },
  seafood: { emoji: "\u{1F41F}", color: "#3b82f6" },
  grains: { emoji: "\u{1F35E}", color: "#d97706" },
  condiments: { emoji: "\u{1F9C2}", color: "#ec4899" },
  other: { emoji: "\u{1F4E6}", color: "#6b7280" },
};

function categorize(ingredient: string): string {
  const lower = ingredient.toLowerCase();
  if (/chicken|beef|steak|pork|turkey|flank/.test(lower)) return "protein";
  if (/salmon|tuna|fish|shrimp|shellfish/.test(lower)) return "seafood";
  if (/milk|cream|cheese|butter|yogurt|mozzarella|burrata|feta|parmesan|pecorino/.test(lower)) return "dairy";
  if (/lettuce|tomato|pepper|onion|garlic|avocado|spinach|cucumber|basil|cilantro|lemon|lime|asparagus|potato|carrot|mango|blueberr|berry/.test(lower)) return "produce";
  if (/pasta|penne|rigatoni|noodle|rice|bread|tortilla|bagel|baguette|ciabatta|oat|flour|quinoa/.test(lower)) return "grains";
  if (/oil|sauce|soy|vinegar|mayo|dressing|sriracha|gochujang|paste|glaze|honey|sugar|maple|salt|pepper|paprika|cumin|sesame/.test(lower)) return "condiments";
  return "other";
}

export default function GroceryDemoStep({ assignments, onNext }: Props) {
  const RECIPES = getMealPlanDemoRecipes();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Generate grocery items from assignments
  const groceryItems = useMemo(() => {
    const items: { name: string; amount: string; unit: string; category: string; id: string }[] = [];
    const seen = new Set<string>();

    const allRecipeIds = Object.values(assignments).flat();
    for (const rid of allRecipeIds) {
      const recipe = RECIPES.find((r) => r.id === rid);
      if (!recipe) continue;
      for (const ing of recipe.ingredients) {
        const key = ing.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            category: categorize(ing.name),
            id: key,
          });
        }
      }
    }
    return items;
  }, [assignments, RECIPES]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof groceryItems> = {};
    for (const item of groceryItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [groceryItems]);

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full pb-8">
      <div className="pt-4 pb-5 px-6 text-center">
        <h1 className="text-[26px] font-black tracking-tight" style={{ color: "#1a1410" }}>
          Your <span style={{ color: "#ea580c" }}>grocery list</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: "#a09890" }}>
          Auto-generated from your meal plan
        </p>
      </div>

      {/* Grocery list */}
      <div className="flex-1 overflow-y-auto px-6 space-y-5">
        {Object.entries(grouped).map(([category, items], gi) => {
          const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
          return (
            <div
              key={category}
              className="animate-stagger-in"
              style={{ animationDelay: `${gi * 0.08}s` }}
            >
              {/* Category header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-lg">{config.emoji}</span>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: config.color }}>
                  {category}
                </h3>
                <span className="text-xs ml-1" style={{ color: "#a09890" }}>
                  ({items.length})
                </span>
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isChecked = checked.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className="w-full flex items-center gap-3 py-3 px-1 text-left transition-all"
                    >
                      {/* Checkbox */}
                      <div
                        className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
                        style={{
                          background: isChecked ? "#ea580c" : "transparent",
                          border: isChecked ? "2px solid #ea580c" : "2px solid #d4d0cc",
                        }}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Item name + amount */}
                      <span
                        className="flex-1 text-[15px]"
                        style={{
                          color: isChecked ? "#a09890" : "#1a1410",
                          textDecoration: isChecked ? "line-through" : "none",
                        }}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs font-medium" style={{ color: "#a09890" }}>
                        {item.amount} {item.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue */}
      <div className="pt-4 px-6">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
          style={{ background: "#1a1410" }}
        >
          Now build your taste profile
        </button>
      </div>
    </div>
  );
}
