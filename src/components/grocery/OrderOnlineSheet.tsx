"use client";

import { useState, useMemo } from "react";
import type { GroceryItem as GroceryItemType } from "@/types";

// ─── Category config (mirrored from GroceryList) ────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  produce:   { label: "Fresh Produce",        color: "text-green-600" },
  protein:   { label: "Meat & Protein",       color: "text-red-600" },
  dairy:     { label: "Dairy, Eggs & Fridge",  color: "text-blue-600" },
  pantry:    { label: "Pantry Staples",        color: "text-amber-700" },
  canned:    { label: "Pantry Staples",        color: "text-amber-700" },
  spices:    { label: "Condiments & Sauces",   color: "text-orange-600" },
  spice:     { label: "Condiments & Sauces",   color: "text-orange-600" },
  condiment: { label: "Condiments & Sauces",   color: "text-orange-600" },
  frozen:    { label: "Frozen",               color: "text-cyan-600" },
  bakery:    { label: "Bakery & Bread",        color: "text-yellow-700" },
  grain:     { label: "Pasta, Grains & Legumes", color: "text-yellow-700" },
  other:     { label: "Other",                color: "text-gray-600" },
};

const CATEGORY_SORT = ["produce", "protein", "dairy", "pantry", "canned", "spices", "spice", "condiment", "frozen", "bakery", "grain", "other"];

function catLabel(cat: string | null) {
  return CATEGORY_CONFIG[cat || "other"]?.label || "Other";
}

function catColor(cat: string | null) {
  return CATEGORY_CONFIG[cat || "other"]?.color || "text-gray-600";
}

function catSort(cat: string | null) {
  const idx = CATEGORY_SORT.indexOf(cat || "other");
  return idx === -1 ? 999 : idx;
}

// ─── Emoji map for items ─────────────────────────────────────────────────────
const ITEM_EMOJIS: Record<string, string> = {
  carrot: "🥕", carrots: "🥕",
  onion: "🧅", onions: "🧅",
  garlic: "🧄",
  potato: "🥔", potatoes: "🥔",
  tomato: "🍅", tomatoes: "🍅",
  pepper: "🌶️", peppers: "🌶️",
  lettuce: "🥬", spinach: "🥬",
  broccoli: "🥦",
  cucumber: "🥒", courgette: "🥒", zucchini: "🥒",
  corn: "🌽",
  mushroom: "🍄", mushrooms: "🍄",
  avocado: "🥑",
  lemon: "🍋", lime: "🍋",
  apple: "🍎", apples: "🍎",
  banana: "🍌", bananas: "🍌",
  egg: "🥚", eggs: "🥚",
  milk: "🥛",
  cheese: "🧀",
  butter: "🧈",
  bread: "🍞",
  rice: "🍚",
  chicken: "🍗",
  beef: "🥩",
  fish: "🐟", salmon: "🐟", tuna: "🐟",
  shrimp: "🦐", prawns: "🦐",
  oil: "🫒",
  salt: "🧂",
  sugar: "🍬",
  flour: "🌾",
  pasta: "🍝", noodles: "🍝", spaghetti: "🍝",
  "soy sauce": "🫘",
  "fish sauce": "🐟",
  "spring onions": "🧅",
  ginger: "🫚",
  honey: "🍯",
};

function getItemEmoji(name: string): string | null {
  const lower = name.toLowerCase();
  if (ITEM_EMOJIS[lower]) return ITEM_EMOJIS[lower];
  // Partial match
  for (const [key, emoji] of Object.entries(ITEM_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return null;
}

// ─── Store definitions ──────────────────────────────────────────────────────
interface Store {
  id: string;
  name: string;
  logo: string; // emoji or URL
  available: boolean;
  buildUrl: (items: { name: string; amount: string | null; unit: string | null }[]) => string;
}

const STORES: Store[] = [
  {
    id: "instacart",
    name: "Instacart",
    logo: "🛒",
    available: true,
    buildUrl: (items) => {
      // Instacart recipe list URL format
      const title = encodeURIComponent("Marco Grocery List");
      const ingredientLines = items.map((i) => {
        const parts = [i.amount, i.unit, i.name].filter(Boolean);
        return parts.join(" ");
      });
      const ingredients = ingredientLines.map((l) => encodeURIComponent(l)).join("&ingredients=");
      return `https://www.instacart.com/store/partner_recipes?title=${title}&ingredients=${ingredients}`;
    },
  },
  {
    id: "walmart",
    name: "Walmart",
    logo: "⭐",
    available: false,
    buildUrl: () => "",
  },
  {
    id: "amazon",
    name: "Amazon Fresh",
    logo: "📦",
    available: false,
    buildUrl: () => "",
  },
];

// ─── Types ──────────────────────────────────────────────────────────────────
type Step = "select" | "store";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: GroceryItemType[];
}

export default function OrderOnlineSheet({ isOpen, onClose, items }: Props) {
  const [step, setStep] = useState<Step>("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStore, setSelectedStore] = useState<string>("instacart");

  // Initialize all unchecked items as selected when sheet opens
  const toBuyItems = useMemo(() => items.filter((i) => !i.checked && !i.soft_deleted), [items]);

  // Group items by category
  const grouped = useMemo(() => {
    const selected = toBuyItems.filter((i) => step === "select" ? true : selectedIds.has(i.id));
    const map = new Map<string, GroceryItemType[]>();
    for (const item of selected) {
      const cat = item.category_override ?? item.category ?? "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return [...map.entries()].sort(([a], [b]) => catSort(a) - catSort(b));
  }, [toBuyItems, selectedIds, step]);

  // Reset state when opening
  const handleOpen = () => {
    setStep("select");
    setSelectedIds(new Set(toBuyItems.map((i) => i.id)));
    setSelectedStore("instacart");
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (isOpen) handleOpen();
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === toBuyItems.length;

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(toBuyItems.map((i) => i.id)));
    }
  }

  function handleContinueToStore() {
    const store = STORES.find((s) => s.id === selectedStore);
    if (!store || !store.available) return;

    const selectedItems = toBuyItems
      .filter((i) => selectedIds.has(i.id))
      .map((i) => ({
        name: i.name_override || i.name,
        amount: i.amount_override || i.amount,
        unit: i.unit_override || i.unit,
      }));

    const url = store.buildUrl(selectedItems);
    window.open(url, "_blank");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative mt-auto bg-white rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          {step === "store" ? (
            <button
              onClick={() => setStep("select")}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-base font-bold text-gray-900">
            {step === "select" ? "Select items" : "Choose store"}
          </h2>
          <div className="w-9" /> {/* spacer */}
        </div>

        {/* ── Step: Select Items ──────────────────────────────────────────── */}
        {step === "select" && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {/* Select all */}
              <button
                onClick={toggleAll}
                className="flex items-center gap-2.5 mb-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  allSelected ? "bg-orange-500 border-orange-500" : "border-gray-300"
                }`}>
                  {allSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {allSelected ? "Deselect all" : "Select all"} ({toBuyItems.length})
              </button>

              {/* Grouped items */}
              <div className="space-y-4">
                {grouped.map(([cat, catItems]) => (
                  <div key={cat}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${catColor(cat)}`}>
                      {catLabel(cat)}
                    </h3>
                    <div className="space-y-1">
                      {catItems.map((item) => {
                        const isSelected = selectedIds.has(item.id);
                        const displayName = item.name_override || item.name;
                        const displayAmount = item.amount_override || item.amount;
                        const displayUnit = item.unit_override || item.unit;
                        const emoji = getItemEmoji(displayName);

                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                              isSelected ? "bg-gray-50" : "bg-white opacity-50"
                            }`}
                          >
                            {/* Emoji */}
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                              {emoji || "🛒"}
                            </div>
                            {/* Name & amount */}
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-gray-900">{displayName}</p>
                              {(displayAmount || displayUnit) && (
                                <p className="text-xs text-gray-500">
                                  {[displayAmount, displayUnit].filter(Boolean).join(" ")}
                                </p>
                              )}
                            </div>
                            {/* Checkbox */}
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected ? "bg-orange-500 border-orange-500" : "border-gray-300"
                            }`}>
                              {isSelected && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next button */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setStep("store")}
                disabled={selectedCount === 0}
                className="w-full py-3.5 bg-orange-500 text-white font-bold text-sm rounded-2xl hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Next ({selectedCount} item{selectedCount !== 1 ? "s" : ""})
              </button>
            </div>
          </>
        )}

        {/* ── Step: Choose Store ──────────────────────────────────────────── */}
        {step === "store" && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-5">
              <div className="space-y-3">
                {STORES.map((store) => {
                  const isSelected = selectedStore === store.id;
                  return (
                    <button
                      key={store.id}
                      onClick={() => store.available && setSelectedStore(store.id)}
                      disabled={!store.available}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all ${
                        isSelected && store.available
                          ? "border-orange-400 bg-orange-50/50"
                          : store.available
                          ? "border-gray-200 bg-white hover:border-gray-300"
                          : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {/* Logo */}
                      {store.id === "instacart" ? (
                        <div className="flex items-center">
                          <span className="text-2xl">🥕</span>
                          <span className="ml-2 text-lg font-bold" style={{ color: "#43B02A" }}>instacart</span>
                        </div>
                      ) : store.id === "walmart" ? (
                        <div className="flex items-center">
                          <span className="text-2xl">⭐</span>
                          <span className="ml-2 text-lg font-bold" style={{ color: "#0071CE" }}>Walmart</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-2xl">{store.logo}</span>
                          <span className="ml-2 text-lg font-bold text-gray-700">{store.name}</span>
                        </div>
                      )}

                      <div className="ml-auto flex-shrink-0">
                        {!store.available ? (
                          <span className="text-xs font-semibold text-white bg-blue-500 px-3 py-1 rounded-full">
                            Coming soon!
                          </span>
                        ) : isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Request store */}
              <p className="text-center text-sm text-gray-400 mt-6">
                Don&apos;t see your store?{" "}
                <a href="mailto:support@marco-app.com" className="text-orange-500 font-medium hover:underline">
                  Tell us here.
                </a>
              </p>
            </div>

            {/* Continue button */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={handleContinueToStore}
                disabled={!STORES.find((s) => s.id === selectedStore)?.available}
                className="w-full py-3.5 bg-orange-500 text-white font-bold text-sm rounded-2xl hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm"
              >
                Continue to store
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
