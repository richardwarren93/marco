"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GroceryItem as GroceryItemType, GroceryList as GroceryListType } from "@/types";
import GroceryItem from "./GroceryItem";
import AddItemSheet from "./AddItemSheet";
import EditItemSheet from "./EditItemSheet";
import OrderOnlineSheet from "./OrderOnlineSheet";

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  produce:   { label: "Produce",              emoji: "🥬" },
  protein:   { label: "Protein",              emoji: "🥩" },
  dairy:     { label: "Dairy & Eggs",         emoji: "🥛" },
  pantry:    { label: "Pantry",               emoji: "🥫" },
  canned:    { label: "Pantry",               emoji: "🥫" },  // legacy alias
  spices:    { label: "Spices & Condiments",  emoji: "🧂" },
  spice:     { label: "Spices & Condiments",  emoji: "🧂" },  // legacy alias
  condiment: { label: "Spices & Condiments",  emoji: "🧂" },  // legacy alias
  frozen:    { label: "Frozen",               emoji: "🧊" },
  bakery:    { label: "Bakery",               emoji: "🍞" },
  grain:     { label: "Bakery",               emoji: "🍞" },  // legacy alias
  other:     { label: "Other",               emoji: "📦" },
};

const CATEGORY_SORT_ORDER = [
  "produce", "protein", "dairy",
  "pantry", "canned",
  "spices", "spice", "condiment",
  "frozen", "bakery", "grain",
  "other",
];

function categoryLabel(cat: string | null): string {
  const c = cat || "other";
  const cfg = CATEGORY_CONFIG[c];
  return cfg ? `${cfg.emoji} ${cfg.label}` : c;
}

function categorySort(cat: string | null): number {
  const idx = CATEGORY_SORT_ORDER.indexOf(cat || "other");
  return idx === -1 ? 999 : idx;
}

// ─── Date range helpers ───────────────────────────────────────────────────────
type RangePreset = "this_week" | "next_week" | "custom";

/** Format a Date as YYYY-MM-DD in local time (avoids UTC shift). */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return localDateStr(d);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00"); // noon avoids DST edge cases
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

function getPresetRange(preset: RangePreset, customRange: { start: string; end: string }) {
  if (preset === "this_week") {
    const start = getMonday(new Date());
    return { start, end: addDays(start, 6) };
  }
  if (preset === "next_week") {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    const start = getMonday(now);
    return { start, end: addDays(start, 6) };
  }
  return customRange;
}

function formatRangeLabel(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const monthFmt = (d: Date) => d.toLocaleString("en-US", { month: "short" });
  const dayFmt = (d: Date) => d.getDate();
  if (s.getMonth() === e.getMonth()) {
    return `${monthFmt(s)} ${dayFmt(s)}–${dayFmt(e)}`;
  }
  return `${monthFmt(s)} ${dayFmt(s)} – ${monthFmt(e)} ${dayFmt(e)}`;
}

// ─── HouseholdGroceryItem ─────────────────────────────────────────────────────
interface HouseholdGroceryItem extends GroceryItemType {
  owner_name?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
type FilterMode = "to_buy" | "checked" | "all";

export default function GroceryList() {
  const router = useRouter();

  // Range
  const [rangePreset, setRangePreset] = useState<RangePreset>("this_week");
  const [customRange, setCustomRange] = useState(() => {
    const start = getMonday(new Date());
    return { start, end: addDays(start, 6) };
  });
  const [rangePickerOpen, setRangePickerOpen] = useState(false);

  // Filter
  const [filter, setFilter] = useState<FilterMode>("to_buy");

  // Data
  const [items, setItems] = useState<GroceryItemType[]>([]);
  const [householdItems, setHouseholdItems] = useState<HouseholdGroceryItem[]>([]);
  const [list, setList] = useState<GroceryListType | null>(null);
  const [mealPlanChanged, setMealPlanChanged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Sheets
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<GroceryItemType | null>(null);
  const [orderOnlineOpen, setOrderOnlineOpen] = useState(false);

  const dateRange = useMemo(
    () => getPresetRange(rangePreset, customRange),
    [rangePreset, customRange]
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/grocery-list?date_start=${dateRange.start}&date_end=${dateRange.end}`
      );
      const data = await res.json();
      setList(data.list ?? null);
      setItems(data.items ?? []);
      setHouseholdItems(data.householdItems ?? []);
      setMealPlanChanged(data.meal_plan_changed ?? false);
    } catch {
      setError("Failed to load grocery list");
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ── Generate / regenerate ──────────────────────────────────────────────────
  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/grocery-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date_start: dateRange.start, date_end: dateRange.end }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setList(data.list);
      setItems(data.items ?? []);
      setMealPlanChanged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  // ── Toggle checked ─────────────────────────────────────────────────────────
  async function handleToggle(id: string, checked: boolean) {
    const isOwn = items.some((i) => i.id === id);
    const snapshot = isOwn ? [...items] : [...householdItems];

    if (isOwn) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
    } else {
      setHouseholdItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
    }
    try {
      await fetch("/api/grocery-list/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, checked }),
      });
    } catch {
      if (isOwn) setItems(snapshot);
      else setHouseholdItems(snapshot as HouseholdGroceryItem[]);
    }
  }

  // ── Save edit ──────────────────────────────────────────────────────────────
  async function handleSaveEdit(
    id: string,
    changes: { name?: string; amount?: string | null; unit?: string | null; category?: string | null }
  ) {
    try {
      await fetch("/api/grocery-list/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      });
      // Refresh list to get updated overrides
      await fetchList();
    } catch {
      // ignore – let user retry
    }
  }

  // ── Delete item ────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setHouseholdItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch("/api/grocery-list/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      await fetchList(); // revert on error
    }
  }

  // ── Clear all items ────────────────────────────────────────────────────────
  const [clearConfirm, setClearConfirm] = useState(false);

  async function handleClearAll() {
    if (!list) return;
    setItems([]);
    setHouseholdItems([]);
    setClearConfirm(false);
    try {
      await fetch("/api/grocery-list/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: list.id }),
      });
    } catch {
      await fetchList(); // revert on error
    }
  }

  // ── Add custom item ────────────────────────────────────────────────────────
  function handleItemAdded(item: GroceryItemType) {
    setItems((prev) => [...prev, item]);
    if (!list) {
      // List was just auto-created — refetch to get list metadata
      fetchList();
    }
  }

  // ── Derived display data ───────────────────────────────────────────────────
  const allItems: HouseholdGroceryItem[] = [...items, ...householdItems];

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (filter === "to_buy") return !item.checked;
      if (filter === "checked") return item.checked;
      return true;
    });
  }, [allItems, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group by effective category (apply override), preserving category grouping
  const grouped = useMemo(() => {
    const map = new Map<string, HouseholdGroceryItem[]>();
    for (const item of filteredItems) {
      const cat = item.category_override ?? item.category ?? "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    // Sort categories
    return [...map.entries()].sort(([a], [b]) => categorySort(a) - categorySort(b));
  }, [filteredItems]);

  const toBuyCount = allItems.filter((i) => !i.checked).length;
  const checkedCount = allItems.filter((i) => i.checked).length;
  const hasItems = allItems.length > 0;
  const generatedFrom = list?.meal_count ?? 0;

  const rangeLabel = (() => {
    if (rangePreset === "this_week") return "This week";
    if (rangePreset === "next_week") return "Next week";
    return formatRangeLabel(dateRange.start, dateRange.end);
  })();

  return (
    <div className="bg-gray-50 pb-24">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-0.5 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Grocery</h1>
          {/* Range selector */}
          <div className="relative">
            <button
              onClick={() => setRangePickerOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
            >
              {rangeLabel}
              <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${rangePickerOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {rangePickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRangePickerOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                  {(["this_week", "next_week", "custom"] as RangePreset[]).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setRangePreset(preset);
                        if (preset !== "custom") setRangePickerOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        rangePreset === preset
                          ? "text-orange-600 bg-orange-50 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {preset === "this_week" ? "This week" : preset === "next_week" ? "Next week" : "Custom range"}
                    </button>
                  ))}

                  {/* Custom range date inputs */}
                  {rangePreset === "custom" && (
                    <div className="px-4 pb-3 pt-1 border-t border-gray-100 space-y-2">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">From</label>
                        <input
                          type="date"
                          value={customRange.start}
                          onChange={(e) => {
                            const start = e.target.value;
                            setCustomRange((r) => ({ start, end: r.end < start ? addDays(start, 6) : r.end }));
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-orange-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">To</label>
                        <input
                          type="date"
                          value={customRange.end}
                          min={customRange.start}
                          onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
                          className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-orange-300"
                        />
                      </div>
                      <button
                        onClick={() => setRangePickerOpen(false)}
                        className="w-full text-xs font-medium text-white bg-orange-500 rounded-lg py-1.5"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 max-w-3xl mx-auto">
          {formatRangeLabel(dateRange.start, dateRange.end)}
        </p>
      </div>

      {/* Centered content container */}
      <div className="max-w-3xl mx-auto">

      {error && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Meal plan changed notice ────────────────────────────────────────── */}
      {mealPlanChanged && !generating && (
        <div className="mx-4 mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-800">Meal plan changed</p>
            <p className="text-xs text-amber-600 mt-0.5">Regenerate to reflect latest meals</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs font-semibold text-orange-600 bg-white border border-orange-200 px-3 py-1.5 rounded-full hover:bg-orange-50 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* ── Regenerate button — when list exists and no change notice showing ── */}
      {list && !loading && !mealPlanChanged && (
        <div className="mx-4 mt-3 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-4 py-2 rounded-full shadow-sm transition-colors disabled:opacity-50"
          >
            {generating ? "Regenerating…" : allItems.length === 0 ? "Generate grocery list" : "Regenerate"}
          </button>
        </div>
      )}

      {/* ── Filter segmented control + clear all ────────────────────────────── */}
      {hasItems && (
        <div className="mx-4 mt-3 flex items-center gap-2">
          <div className="flex flex-1 bg-gray-100 rounded-xl p-1 gap-1">
            {([
              { key: "to_buy",  label: `Buy${toBuyCount > 0 ? ` (${toBuyCount})` : ""}` },
              { key: "checked", label: `Have${checkedCount > 0 ? ` (${checkedCount})` : ""}` },
            ] as { key: FilterMode; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {!clearConfirm ? (
            <button
              onClick={() => setClearConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              Clear all
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearAll}
                className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Confirm
              </button>
              <button
                onClick={() => setClearConfirm(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Order online button ─────────────────────────────────────────────── */}
      {hasItems && toBuyCount > 0 && !loading && (
        <div className="mx-4 mt-3">
          <button
            onClick={() => setOrderOnlineOpen(true)}
            className="w-full flex items-center justify-center gap-2.5 py-3 bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Order online</span>
          </button>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {loading ? (
        /* Loading skeleton */
        <div className="mx-4 mt-3 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-3" />
              <div className="space-y-2.5">
                {[1, 2].map((m) => (
                  <div key={m} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md bg-gray-100 animate-pulse flex-shrink-0" />
                    <div className="h-3 flex-1 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      ) : !list ? (
        /* No list yet — empty state */
        <div className="mx-4 mt-6 text-center">
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-10">
            <p className="text-4xl mb-4">🛒</p>
            <p className="text-gray-800 font-semibold text-base mb-1">No grocery list yet</p>
            <p className="text-gray-400 text-sm mb-6">
              Add meals to your {rangeLabel.toLowerCase()} calendar, then generate your list.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate grocery list"}
            </button>
          </div>
        </div>

      ) : grouped.length === 0 ? (
        /* List exists but nothing to show */
        <div className="mx-4 mt-6 text-center">
          {allItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-6 py-10">
              <p className="text-4xl mb-4">✨</p>
              <p className="text-gray-800 font-semibold text-base mb-1">List cleared</p>
              <p className="text-gray-400 text-sm mb-1">
                Tap &quot;Generate grocery list&quot; above to rebuild from your meal plan.
              </p>
            </div>
          ) : filter === "to_buy" ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-6 py-10">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-gray-800 font-semibold text-base mb-1">All done!</p>
              <p className="text-gray-400 text-sm">Everything is checked off your list.</p>
            </div>
          ) : filter === "checked" ? (
            <div className="py-10">
              <p className="text-gray-400 text-sm">Nothing marked as have yet.</p>
            </div>
          ) : (
            <div className="py-10">
              <p className="text-gray-400 text-sm">Your list is empty.</p>
            </div>
          )}
        </div>

      ) : (
        /* Grouped list */
        <div className="mx-4 mt-3 space-y-3">
          {grouped.map(([cat, catItems]) => (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Category header */}
              <div className="px-4 pt-3 pb-1.5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {categoryLabel(cat)}
                </h3>
              </div>
              {/* Items */}
              <div className="px-3 pb-2 space-y-0.5">
                {catItems.map((item) => (
                  <GroceryItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onEdit={setEditItem}
                    onDelete={handleDelete}
                    ownerName={item.owner_name}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* + Add item row — always at the bottom inside the list area */}
          <button
            onClick={() => setAddSheetOpen(true)}
            className="w-full flex items-center gap-2.5 px-4 py-3.5 bg-white rounded-2xl border border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-colors text-left"
          >
            <span className="w-5 h-5 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 flex-shrink-0 text-sm">+</span>
            <span className="text-sm text-gray-400">Add item</span>
          </button>
        </div>
      )}

      {/* + Add item button when list is empty state with items */}
      {!loading && list && (
        <div className="mx-4 mt-3">
          {grouped.length === 0 && (
            <button
              onClick={() => setAddSheetOpen(true)}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 bg-white rounded-2xl border border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
            >
              <span className="text-sm text-gray-400">+ Add item</span>
            </button>
          )}
        </div>
      )}

      </div>{/* close max-w-3xl container */}

      {/* Generating overlay */}
      {generating && (
        <div className="fixed inset-0 z-50 bg-white/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-700">Generating your list…</p>
          </div>
        </div>
      )}

      {/* Sheets */}
      <AddItemSheet
        isOpen={addSheetOpen}
        listId={list?.id ?? null}
        dateStart={dateRange.start}
        dateEnd={dateRange.end}
        onClose={() => setAddSheetOpen(false)}
        onAdd={handleItemAdded}
      />

      <EditItemSheet
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
      />

      <OrderOnlineSheet
        isOpen={orderOnlineOpen}
        onClose={() => setOrderOnlineOpen(false)}
        items={allItems}
      />
    </div>
  );
}
