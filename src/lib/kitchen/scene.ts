// Modular kitchen scene — the architecture from the "modular scene" spec.
//
// The kitchen READS as one coherent illustration but is composed from a fixed
// base painting (~70–80%) plus a small number of progression ZONES (~20–30%)
// that render transparent object assets from structured KitchenState. Progression
// logic updates STATE; this module owns how state → which assets are visible and
// where. Assets are isolated OBJECTS, never whole rooms — so we can change herbs,
// books, cookware, fridge memories, etc. independently, personalize per user, and
// add future kitchens by swapping a definition (not rewriting product logic).

export type KitchenId = "starter_apartment";

// ── State (persisted; extends user_profiles.kitchen_state) ───────────────────
export interface KitchenState {
  kitchenId: KitchenId;
  herbs: { stage: number }; // 0..4 (empty → mature garden), transforms in place
  bookshelf: { slots: (string | null)[] }; // collection ids ("weeknight"…) or null
  cookware: { primary: string | null; stage: number };
  fridge: { memories: string[] }; // finished-dish photos / magnets (curated, few)
  wall: { milestone: string | null };
  counter: { identityObject: string | null };
}

// ── Rendered asset: one object placed on the scene, anchored BOTTOM-CENTER at
//    (cx, by) as a % of the scene, so objects "sit" on their surface. ─────────
export interface RenderedAsset {
  key: string;
  src: string;
  cx: number; // center-x %  (0–100)
  by: number; // baseline-y % (the surface the object rests on)
  w: number; // rendered width, px
  shadow?: number; // contact-shadow width as a fraction of w (0 = none)
}

export interface Zone {
  id: "herb" | "bookshelf" | "cookware" | "fridge" | "wall" | "counter";
  label: string; // a11y + nav
  navKey: "onWindow" | "onBookshelf" | "onStove" | "onFridge" | "onGrocery" | "onMarco";
  focus: { x: number; y: number }; // camera-push focus point (%)
  render: (s: KitchenState) => RenderedAsset[];
}

export interface KitchenDefinition {
  kitchenId: KitchenId;
  baseScene: string;
  zones: Zone[];
}

// ── Asset tables (transparent PNGs in public/kitchen/). Only herbs + books
//    exist today; the rest are declared so their zones are ready for art. ─────
const HERB_BY_STAGE: Record<number, string> = {
  0: "/kitchen/herb-sprout.png",
  1: "/kitchen/herb-sprout.png",
  2: "/kitchen/herb.png",
  3: "/kitchen/herb.png",
  4: "/kitchen/herb.png",
};
// Colorways cycled per shelf slot until collection-specific covers exist.
const BOOK_COLORWAYS = ["/kitchen/book-1.png", "/kitchen/book-2.png", "/kitchen/book-3.png"];

// ── The starter apartment ────────────────────────────────────────────────────
// Positions are tuned to the current base painting's composition (do NOT change
// the composition). Zones with no art yet return [] but keep their slot + focus.
export const STARTER_KITCHEN: KitchenDefinition = {
  kitchenId: "starter_apartment",
  baseScene: "/kitchen/starter.png",
  zones: [
    {
      id: "herb",
      label: "This week",
      navKey: "onWindow",
      focus: { x: 6, y: 42 },
      render: (s) => {
        const stage = Math.max(0, Math.min(4, s.herbs.stage));
        const src = HERB_BY_STAGE[stage];
        return [{ key: `herb-${stage}`, src, cx: 8, by: 47, w: stage >= 2 ? 50 : 36, shadow: 0.8 }];
      },
    },
    {
      id: "bookshelf",
      label: "Recipes",
      navKey: "onBookshelf",
      focus: { x: 64, y: 18 },
      render: (s) => {
        const books = s.bookshelf.slots.filter(Boolean).slice(0, 5);
        // Left-to-right along the shelf board; each book cycles a colorway.
        return books.map((slot, i) => ({
          key: `book-${i}-${slot}`,
          src: BOOK_COLORWAYS[i % BOOK_COLORWAYS.length],
          cx: 60 + i * 3.6,
          by: 22.5,
          w: 20,
          shadow: 0.7,
        }));
      },
    },
    // Declared zones, no art yet — negative space is intentional at the start.
    { id: "cookware", label: "Cook", navKey: "onStove", focus: { x: 50, y: 60 }, render: () => [] },
    { id: "fridge", label: "Plan", navKey: "onFridge", focus: { x: 88, y: 40 }, render: () => [] },
    { id: "wall", label: "Milestones", navKey: "onMarco", focus: { x: 40, y: 26 }, render: () => [] },
    { id: "counter", label: "Kitchen", navKey: "onMarco", focus: { x: 30, y: 50 }, render: () => [] },
  ],
};

export const KITCHENS: Record<KitchenId, KitchenDefinition> = {
  starter_apartment: STARTER_KITCHEN,
};

export function getKitchen(id: KitchenId = "starter_apartment"): KitchenDefinition {
  return KITCHENS[id] ?? STARTER_KITCHEN;
}

// ── Deriving state ───────────────────────────────────────────────────────────
// The shelf is never empty on day 1 (that reads as missing content, per §4): it
// always starts with one neutral cookbook, then the user's saved recipes fill in.
export function deriveKitchenState(input: { herbStage?: number; savedRecipes?: number; kitchenId?: KitchenId }): KitchenState {
  const recipes = Math.max(0, input.savedRecipes ?? 0);
  const slots: (string | null)[] = ["classics", ...Array.from({ length: Math.min(recipes, 4) }, () => "recipe")];
  return {
    kitchenId: input.kitchenId ?? "starter_apartment",
    herbs: { stage: Math.max(0, Math.min(4, input.herbStage ?? 0)) },
    bookshelf: { slots },
    cookware: { primary: null, stage: 0 },
    fridge: { memories: [] },
    wall: { milestone: null },
    counter: { identityObject: null },
  };
}

// Four canonical states for the modular-architecture demo — SAME base kitchen,
// different combinations of modular assets (never four flattened images).
export const DEMO_STATES: { label: string; state: KitchenState }[] = [
  { label: "Day 1", state: deriveKitchenState({ herbStage: 1, savedRecipes: 0 }) },
  { label: "Meal ~5", state: deriveKitchenState({ herbStage: 2, savedRecipes: 2 }) },
  { label: "Meal ~15", state: deriveKitchenState({ herbStage: 3, savedRecipes: 3 }) },
  { label: "Meal ~30", state: deriveKitchenState({ herbStage: 4, savedRecipes: 4 }) },
];
