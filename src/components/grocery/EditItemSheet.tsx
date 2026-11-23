"use client";

import { useState, useEffect } from "react";
import type { GroceryItem } from "@/types";
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from "./AddItemSheet";
import MotionSheet, { useLastDefined } from "@/components/ui/MotionSheet";
import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LIME, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

interface EditItemSheetProps {
  item: GroceryItem | null;
  onClose: () => void;
  onSave: (id: string, changes: { name?: string; amount?: string | null; unit?: string | null; category?: string | null }) => void;
  onDelete: (id: string) => void;
}

export default function EditItemSheet({ item: itemProp, onClose, onSave, onDelete }: EditItemSheetProps) {
  const item = useLastDefined(itemProp); // stays put while the sheet drops away
  const displayName = item?.name_override ?? item?.name ?? "";
  const displayAmount = item?.amount_override ?? item?.amount ?? "";
  const displayUnit = item?.unit_override ?? item?.unit ?? "";
  const displayCategory = item?.category_override ?? item?.category ?? "other";

  const [name, setName] = useState(displayName);
  const [amount, setAmount] = useState(displayAmount);
  const [unit, setUnit] = useState(displayUnit);
  const [category, setCategory] = useState(displayCategory);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keyed on the PROP: it goes null on close, so every reopen starts fresh
  // (the retained `item` would keep stale edits and an armed Delete).
  useEffect(() => {
    if (itemProp) {
      setName(itemProp.name_override ?? itemProp.name);
      setAmount(itemProp.amount_override ?? itemProp.amount ?? "");
      setUnit(itemProp.unit_override ?? itemProp.unit ?? "");
      setCategory(itemProp.category_override ?? itemProp.category ?? "other");
      setConfirmDelete(false);
    }
  }, [itemProp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock main scroll while sheet is open; reset scroll position on close
  useEffect(() => {
    const main = document.querySelector("main") as HTMLElement | null;
    if (!main) return;
    if (itemProp) {
      main.style.overflow = "hidden";
    } else {
      main.style.overflow = "";
      main.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    return () => { main.style.overflow = ""; };
  }, [!!itemProp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !item) return;
    setSaving(true);
    try {
      await onSave(item.id, {
        name: name.trim(),
        amount: amount.trim() || null,
        unit: unit || null,
        category: category || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!item) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(item.id);
    onClose();
  }

  const isGenerated = !item.is_custom;

  return (
    <MotionSheet open={!!itemProp} onClose={onClose} label="Edit item" z={60} scrim="rgba(0,0,0,0.4)" showHandle={false} className="w-full flex flex-col sm:max-w-lg" style={{ background: PAPER, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: `2.5px solid ${INK}`, borderLeft: `2.5px solid ${INK}`, borderRight: `2.5px solid ${INK}`, maxHeight: "85dvh", paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: INK, opacity: 0.25 }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0" style={{ borderBottom: `2.5px solid ${INK}` }}>
          <div>
            <h3 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>Edit item</h3>
            {isGenerated && (
              <p className="text-[11px] mt-0.5" style={{ color: INK_MUTED }}>Changes are saved as personal overrides</p>
            )}
          </div>
          <button onClick={onClose} className="p-1" style={{ color: INK_MUTED }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
                Item name <span style={{ color: TOMATO }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm outline-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
              />
            </div>

            {/* Quantity + Unit */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>Quantity</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
          </div>

          {/* Action buttons — always visible at bottom */}
          <div className="flex gap-3 px-5 pt-3 pb-1 flex-shrink-0" style={{ borderTop: `2.5px solid ${INK}` }}>
            <button
              type="button"
              onClick={handleDelete}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                confirmDelete
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-100 text-red-500 hover:bg-red-50"
              }`}
            >
              {confirmDelete ? "Confirm delete" : isGenerated ? "Remove" : "Delete"}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 py-2.5 text-sm active:scale-[0.98] transition-transform disabled:opacity-40" style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 3px 0 ${INK}` }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
    </MotionSheet>
  );
}
