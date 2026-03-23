"use client";

import { useState, useEffect } from "react";
import type { GroceryItem } from "@/types";
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from "./AddItemSheet";

interface EditItemSheetProps {
  item: GroceryItem | null;
  onClose: () => void;
  onSave: (id: string, changes: { name?: string; amount?: string | null; unit?: string | null; category?: string | null }) => void;
  onDelete: (id: string) => void;
}

export default function EditItemSheet({ item, onClose, onSave, onDelete }: EditItemSheetProps) {
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

  useEffect(() => {
    if (item) {
      setName(item.name_override ?? item.name);
      setAmount(item.amount_override ?? item.amount ?? "");
      setUnit(item.unit_override ?? item.unit ?? "");
      setCategory(item.category_override ?? item.category ?? "other");
      setConfirmDelete(false);
    }
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock main scroll while sheet is open
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    if (item) {
      main.style.overflow = "hidden";
    } else {
      main.style.overflow = "";
    }
    return () => { main.style.overflow = ""; };
  }, [!!item]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />

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
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Edit item</h3>
            {isGenerated && (
              <p className="text-[11px] text-gray-400 mt-0.5">Changes are saved as personal overrides</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
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
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Item name <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
              />
            </div>

            {/* Quantity + Unit */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Quantity</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
          </div>

          {/* Action buttons — always visible at bottom */}
          <div className="flex gap-3 px-5 pt-3 pb-1 border-t border-gray-100 flex-shrink-0">
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
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
