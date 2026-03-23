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
  for (const [key, emoji] of Object.entries(ITEM_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return null;
}

// ─── Store definitions ──────────────────────────────────────────────────────
interface Store {
  id: string;
  name: string;
  available: boolean;
  url: string;
  brandColor: string;
}

const STORES: Store[] = [
  {
    id: "instacart",
    name: "Instacart",
    available: true,
    url: "https://www.instacart.com",
    brandColor: "#43B02A",
  },
  {
    id: "walmart",
    name: "Walmart",
    available: false,
    url: "https://www.walmart.com/grocery",
    brandColor: "#0071CE",
  },
  {
    id: "amazon",
    name: "Amazon Fresh",
    available: false,
    url: "https://www.amazon.com/fresh",
    brandColor: "#FF9900",
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
  const [copied, setCopied] = useState(false);

  const toBuyItems = useMemo(() => items.filter((i) => !i.checked && !i.soft_deleted), [items]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (isOpen) {
      setStep("select");
      setSelectedIds(new Set(toBuyItems.map((i) => i.id)));
      setSelectedStore("instacart");
      setCopied(false);
    }
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

  /** Build a plain-text grocery list for clipboard */
  function buildListText(): string {
    const selectedItems = toBuyItems.filter((i) => selectedIds.has(i.id));
    // Group by category
    const catMap = new Map<string, typeof selectedItems>();
    for (const item of selectedItems) {
      const cat = item.category_override ?? item.category ?? "other";
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(item);
    }
    const sorted = [...catMap.entries()].sort(([a], [b]) => catSort(a) - catSort(b));

    const lines: string[] = [];
    for (const [cat, catItems] of sorted) {
      lines.push(`\n${catLabel(cat).toUpperCase()}`);
      for (const item of catItems) {
        const name = item.name_override || item.name;
        const amount = item.amount_override || item.amount;
        const unit = item.unit_override || item.unit;
        const qty = [amount, unit].filter(Boolean).join(" ");
        lines.push(qty ? `- ${name} (${qty})` : `- ${name}`);
      }
    }
    return `Marco Grocery List\n${"─".repeat(20)}${lines.join("\n")}`;
  }

  async function handleContinueToStore() {
    const store = STORES.find((s) => s.id === selectedStore);
    if (!store || !store.available) return;

    // Copy list to clipboard
    const text = buildListText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // fallback — still open the store
    }

    // Small delay so user sees the "copied" feedback, then open store
    setTimeout(() => {
      window.open(store.url, "_blank");
      onClose();
    }, 600);
  }

  return (
    // z-[60] to overlay above bottom tab bar (z-50)
    <div className="fixed inset-0 z-[60] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet — full height on mobile for proper scrolling */}
      <div
        className="relative mt-auto bg-white rounded-t-3xl flex flex-col animate-slide-up"
        style={{
          maxHeight: "92vh",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={step === "store" ? () => setStep("select") : onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-gray-900">
            {step === "select" ? "Select items" : "Choose store"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Step: Select Items ──────────────────────────────────────────── */}
        {step === "select" && (
          <>
            <div className="overflow-y-auto flex-1 min-h-0 px-5 py-3">
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
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                              {emoji || "🛒"}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-gray-900">{displayName}</p>
                              {(displayAmount || displayUnit) && (
                                <p className="text-xs text-gray-500">
                                  {[displayAmount, displayUnit].filter(Boolean).join(" ")}
                                </p>
                              )}
                            </div>
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

            {/* Next button — sticky at bottom */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
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
            <div className="overflow-y-auto flex-1 min-h-0 px-5 py-5">
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
                      {store.id === "instacart" ? (
                        <div className="flex items-center">
                          <span className="text-2xl">🥕</span>
                          <span className="ml-2 text-lg font-bold" style={{ color: store.brandColor }}>instacart</span>
                        </div>
                      ) : store.id === "walmart" ? (
                        <div className="flex items-center">
                          <span className="text-2xl">⭐</span>
                          <span className="ml-2 text-lg font-bold" style={{ color: store.brandColor }}>Walmart</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-2xl">📦</span>
                          <span className="ml-2 text-lg font-bold" style={{ color: store.brandColor }}>{store.name}</span>
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

              {/* Info note */}
              <div className="mt-5 px-4 py-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 text-center">
                  Your grocery list will be copied to clipboard so you can easily paste it in the store app.
                </p>
              </div>

              <p className="text-center text-sm text-gray-400 mt-4">
                Don&apos;t see your store?{" "}
                <a href="mailto:support@marco-app.com" className="text-orange-500 font-medium hover:underline">
                  Tell us here.
                </a>
              </p>
            </div>

            {/* Continue button */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
              <button
                onClick={handleContinueToStore}
                disabled={!STORES.find((s) => s.id === selectedStore)?.available}
                className={`w-full py-3.5 font-bold text-sm rounded-2xl active:scale-[0.98] transition-all shadow-sm ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                } disabled:opacity-40`}
              >
                {copied ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    List copied! Opening store...
                  </span>
                ) : (
                  "Continue to store"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
