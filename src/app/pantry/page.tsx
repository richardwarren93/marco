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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Pantry</h1>

      <div className="mb-8">
        <AddIngredientForm onAdded={fetchItems} />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading pantry...</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {items.length} item{items.length !== 1 ? "s" : ""} in your pantry
          </p>
          <PantryList items={items} onChanged={fetchItems} />
        </>
      )}
    </div>
  );
}
