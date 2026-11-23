"use client";

import { useState, useEffect } from "react";
import type { GroceryItem } from "@/types";
import MotionSheet from "@/components/ui/MotionSheet";
import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LIME, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

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
    const main = document.querySelector("main") as HTMLElement | null;
    if (!main) return;
    if (isOpen) {
      main.style.overflow = "hidden";
    } else {
      main.style.overflow = "";
      main.scrollTop = 0;
      window.scrollTo(0, 0);
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

  return (
    <MotionSheet open={isOpen} onClose={handleClose} label="Add an item" z={60} scrim="rgba(0,0,0,0.4)" showHandle={false} className="w-full flex flex-col sm:max-w-lg" style={{ background: PAPER, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: `2.5px solid ${INK}`, borderLeft: `2.5px solid ${INK}`, borderRight: `2.5px solid ${INK}`, maxHeight: "85dvh", paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: INK, opacity: 0.25 }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0" style={{ borderBottom: `2.5px solid ${INK}` }}>
          <h3 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>Add item</h3>
          <button onClick={handleClose} className="p-1" style={{ color: INK_MUTED }}>
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
              <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
                Item name <span style={{ color: TOMATO }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. olive oil"
                className="w-full px-3.5 py-2.5 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
              />
            </div>

            {/* Quantity + Unit row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>Quantity</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-3.5 py-2.5 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
                />
              </div>
              <div className="w-32">
                <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm outline-none appearance-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
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
              <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className="px-3 py-1.5 text-xs active:scale-95 transition-transform"
                    style={{
                      background: category === opt.value ? TOMATO : PAPER,
                      color: category === opt.value ? PAPER : INK,
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      border: `2px solid ${INK}`,
                      borderRadius: 99,
                      boxShadow: category === opt.value ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}`,
                      transform: category === opt.value ? "translate(1px, 1px)" : undefined,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs font-semibold" style={{ color: TOMATO_DARK }}>{error}</p>}
          </div>

          {/* Action buttons — always visible at bottom */}
          <div className="flex gap-3 px-5 pt-3 pb-1 flex-shrink-0" style={{ borderTop: `2.5px solid ${INK}` }}>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 text-sm active:scale-[0.98] transition-transform" style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 3px 0 ${INK}` }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 py-2.5 text-sm active:scale-[0.98] transition-transform disabled:opacity-40" style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 3px 0 ${INK}` }}
            >
              {saving ? "Adding…" : "Add item"}
            </button>
          </div>
        </form>
    </MotionSheet>
  );
}
