"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AddIngredientForm from "@/components/pantry/AddIngredientForm";
import PantryList from "@/components/pantry/PantryList";
import type { PantryItem } from "@/types";

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("pantry_items")
      .select("*")
      .order("category")
      .order("name");
    setItems((data as PantryItem[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">🛒 My Pantry</h1>
      <p className="text-sm text-gray-400 mb-6">
        {items.length} item{items.length !== 1 ? "s" : ""} tracked
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <AddIngredientForm onAdded={fetchItems} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
          <span className="text-4xl block mb-3">🥬</span>
          <p className="text-gray-500">Your pantry is empty</p>
          <p className="text-gray-400 text-sm mt-1">Add ingredients above to get started</p>
        </div>
      ) : (
        <PantryList items={items} onChanged={fetchItems} />
      )}
    </div>
  );
}
