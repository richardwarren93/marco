"use client";

import { useEffect, useState } from "react";
import type { GroceryItem as GroceryItemType, GroceryList as GroceryListType } from "@/types";
import GroceryItem from "./GroceryItem";

const CATEGORY_LABELS: Record<string, string> = {
  produce: "🥬 Produce",
  protein: "🥩 Protein",
  dairy: "🧀 Dairy",
  grain: "🌾 Grains & Bread",
  canned: "🥫 Canned Goods",
  frozen: "🧊 Frozen",
  spice: "🧂 Spices",
  condiment: "🫙 Condiments",
  other: "📦 Other",
};

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function GroceryList({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<GroceryItemType[]>([]);
  const [list, setList] = useState<GroceryListType | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [newItemName, setNewItemName] = useState("");

  const weekStart = getMonday(new Date());

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch(`/api/grocery-list?week_start=${weekStart}`);
      const data = await res.json();
      setList(data.list);
      setItems(data.items || []);
    } catch {
      // No list yet
    }
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/grocery-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setList(data.list);
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggle(id: string, checked: boolean) {
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));

    try {
      await fetch("/api/grocery-list/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, checked }),
      });
    } catch {
      // Revert
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !checked } : i)));
    }
  }

  async function handleDelete(id: string) {
    const prev = items;
    setItems(items.filter((i) => i.id !== id));

    try {
      await fetch("/api/grocery-list/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      setItems(prev);
    }
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const body: Record<string, string> = { name: newItemName.trim() };

      if (list) {
        body.list_id = list.id;
      } else {
        // No list yet — pass week_start so the API auto-creates one
        body.week_start = weekStart;
      }

      const res = await fetch("/api/grocery-list/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.item) {
        setItems((prev) => [...prev, data.item]);
        setNewItemName("");
        // If a new list was auto-created, store it
        if (!list && data.list_id) {
          setList({ id: data.list_id, user_id: "", week_start: weekStart, created_at: "" });
        }
      }
    } catch {
      // ignore
    }
  }

  // Group items by category
  const grouped = new Map<string, GroceryItemType[]>();
  for (const item of items) {
    const cat = item.category || "other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            🛒 Grocery List
          </h2>
          {items.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {checkedCount}/{items.length} items checked
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs font-medium text-orange-600 hover:text-orange-700 px-3 py-1.5 bg-orange-50 rounded-full hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : items.length > 0 ? "Regenerate" : "Generate from Plan"}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-400 text-sm mb-2">No grocery list yet</p>
          <p className="text-gray-400 text-xs">
            Add meals to your weekly calendar, then generate a grocery list
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {[...grouped.entries()].map(([category, categoryItems]) => (
            <div key={category} className="px-4 py-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="space-y-0.5">
                {categoryItems.map((item) => (
                  <GroceryItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add custom item — always visible */}
      <form
        onSubmit={handleAddCustom}
        className="flex items-center gap-2 px-4 py-3 border-t border-gray-100"
      >
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add an item..."
            className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-30 px-3 py-1.5"
          >
            Add
          </button>
        </form>
    </div>
  );
}
