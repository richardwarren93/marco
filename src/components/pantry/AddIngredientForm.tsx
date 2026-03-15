"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  "produce",
  "protein",
  "dairy",
  "grain",
  "spice",
  "canned",
  "frozen",
  "condiment",
  "other",
];

export default function AddIngredientForm({
  onAdded,
}: {
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.from("pantry_items").insert({
      name: name.trim().toLowerCase(),
      category,
      quantity: quantity || null,
    });

    if (error) {
      if (error.code === "23505") {
        setError("This item is already in your pantry.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    setName("");
    setQuantity("");
    setLoading(false);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Ingredient
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. chicken breast"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div className="w-32">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Quantity
        </label>
        <input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="e.g. 2 lbs"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add"}
      </button>
      {error && <p className="w-full text-red-500 text-sm">{error}</p>}
    </form>
  );
}
