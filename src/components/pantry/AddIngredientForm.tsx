"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import IngredientAutocomplete from "./IngredientAutocomplete";
import { GENERIC_UNITS, type IngredientData } from "@/data/ingredients";

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
  const [quantityAmount, setQuantityAmount] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("count");
  const [availableUnits, setAvailableUnits] = useState<string[]>(GENERIC_UNITS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  function handleIngredientSelect(ingredient: IngredientData | null, _name: string) {
    if (ingredient) {
      setCategory(ingredient.category);
      setAvailableUnits(ingredient.units);
      setQuantityUnit(ingredient.units[0]);
    } else {
      setAvailableUnits(GENERIC_UNITS);
      setQuantityUnit("count");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setLoading(false); return; }

    const quantity = quantityAmount.trim()
      ? `${quantityAmount.trim()} ${quantityUnit}`
      : null;

    const { error } = await supabase.from("pantry_items").insert({
      user_id: user.id,
      name: name.trim().toLowerCase(),
      category,
      quantity,
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
    setQuantityAmount("");
    setQuantityUnit("count");
    setAvailableUnits(GENERIC_UNITS);
    setLoading(false);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Row 1: Ingredient name with autocomplete */}
      <IngredientAutocomplete
        value={name}
        onChange={setName}
        onSelect={handleIngredientSelect}
      />

      {/* Row 2: Category, Quantity, Unit, Add button */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-28">
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

        <div className="w-20">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Qty
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={quantityAmount}
            onChange={(e) => setQuantityAmount(e.target.value)}
            placeholder="—"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="w-24">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Unit
          </label>
          <select
            value={quantityUnit}
            onChange={(e) => setQuantityUnit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            {availableUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
