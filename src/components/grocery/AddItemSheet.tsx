"use client";

import { useState, useEffect } from "react";
import type { GroceryItem } from "@/types";

export const CATEGORY_OPTIONS = [
  { value: "produce",  label: "Produce" },
  { value: "protein",  label: "Protein" },
  { value: "dairy",    label: "Dairy & Eggs" },
  { value: "pantry",   label: "Pantry" },
  { value: "spices",   label: "Spices & Condiments" },
  { value: "frozen",   label: "Frozen" },
  { value: "bakery",   label: "Bakery" },
  { value: "other",    label: "Other" },
];

export const UNIT_OPTIONS = [
  "ct", "lb", "oz", "g", "kg", "ml", "l",
  "cup", "tbsp", "tsp", "can", "jar", "pack", "bunch",
];

interface AddItemSheetProps {
  isOpen: boolean;
  listId: string | null;
  dateStart: string;
  dateEnd: string;
  onClose: () => void;
  onAdd: (item: GroceryItem) => void;
}

export default function AddItemSheet({
  isOpen,
  listId,
  dateStart,
  dateEnd,
  onClose,
  onAdd,
}: AddItemSheetProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("other");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    if (isOpen) {
      main.style.overflow = "hidden";
    } else {
      main.style.overflow = "";
    }
    return () => { main.style.overflow = ""; };
  }, [isOpen]);

  function reset() {
    setName("");
    setQuantity("");
    setUnit("");
    setCategory("other");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        category,
        date_start: dateStart,
        date_end: dateEnd,
      };
      if (listId) body.list_id = listId;
      if (quantity.trim()) body.quantity = quantity.trim();
      if (unit) body.unit = unit;

      const res = await fetch("/api/grocery-list/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onAdd(data.item);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: "85dvh",
          paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 text-base">Add item</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 space-y-4">
            {/* Item name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Item name <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. olive oil"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
              />
            </div>

            {/* Quantity + Unit row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Quantity</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent appearance-none"
                >
                  <option value="">— none —</option>
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      category === opt.value
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Action buttons — always visible at bottom */}
          <div className="flex gap-3 px-5 pt-3 pb-1 border-t border-gray-100 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-40"
            >
              {saving ? "Adding…" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
