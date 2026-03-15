"use client";

import { createClient } from "@/lib/supabase/client";
import type { PantryItem } from "@/types";

export default function PantryList({
  items,
  onChanged,
}: {
  items: PantryItem[];
  onChanged: () => void;
}) {
  const supabase = createClient();

  // Group by category
  const grouped = items.reduce(
    (acc, item) => {
      const cat = item.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, PantryItem[]>
  );

  const sortedCategories = Object.keys(grouped).sort();

  async function handleDelete(id: string) {
    await supabase.from("pantry_items").delete().eq("id", id);
    onChanged();
  }

  if (items.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        Your pantry is empty. Add some ingredients above.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {category}
          </h3>
          <div className="space-y-1">
            {grouped[category].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-900">{item.name}</span>
                  {item.quantity && (
                    <span className="text-gray-400 text-sm">
                      ({item.quantity})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
