// Modular kitchen — FIXED SCENE + FIXED ZONES + PRE-COMPOSITED ZONE STATES.
//
// The kitchen reads as ONE painterly illustration. Progression never positions
// loose objects (that looked pasted-on). Instead each zone is a fixed rectangle,
// and the artwork pipeline produces complete, exactly-zone-sized crops with the
// object already positioned / lit / shadowed / occluded INTO the scene. The app
// only chooses WHICH pre-composited state to show per zone. Zone bounds are in
// the base image's coordinate space and NEVER change between states, so swaps are
// seamless. New kitchens = a new KitchenDefinition (same system, different art).

export type KitchenId = "starter_apartment";

// ── State (structured, independent from artwork) ─────────────────────────────
export interface KitchenState {
  kitchenId: KitchenId;
  consistency: { herbStage: number }; // window zone
  repertoire: { shelfState: string }; // bookshelf zone
  skillIdentity: { stoveState: string }; // stove zone
  memories: { fridgeState: string }; // fridge zone (later)
  environment: { warmth: number };
}

// Bounds as % of the scene (= the base image's coordinate space).
export interface ZoneBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Zone {
  id: "window" | "bookshelf" | "stove" | "fridge" | "counter" | "wall";
  label: string;
  navKey: "onWindow" | "onBookshelf" | "onStove" | "onFridge" | "onGrocery" | "onMarco";
  bounds: ZoneBounds;
  focus: { x: number; y: number }; // camera-push point (zone center)
  states: Record<string, string>; // stateKey → exact-zone-sized image
  resolve: (s: KitchenState) => string; // → stateKey
}

export interface KitchenDefinition {
  kitchenId: KitchenId;
  baseScene: string;
  sceneW: number;
  sceneH: number; // base pixel dims (for aspect-locking the stage)
  zones: Zone[];
}

const ZP = "/kitchen/zones/"; // zone-state art

// ── The starter apartment ────────────────────────────────────────────────────
// Bounds derived from the canonical base (768×1536) — see zones/_zone-map.png.
export const STARTER_KITCHEN: KitchenDefinition = {
  kitchenId: "starter_apartment",
  baseScene: "/kitchen/starter.png",
  sceneW: 768,
  sceneH: 1536,
  zones: [
    {
      id: "window",
      label: "This week",
      navKey: "onWindow",
      bounds: { x: 0, y: 29.95, w: 29.43, h: 17.71 },
      focus: { x: 12, y: 38 },
      states: {
        starter: ZP + "window_starter.png",
        developing: ZP + "window_developing.png",
        mature: ZP + "window_mature.png",
      },
      resolve: (s) => (s.consistency.herbStage <= 0 ? "starter" : s.consistency.herbStage === 1 ? "developing" : "mature"),
    },
    {
      id: "bookshelf",
      label: "Recipes",
      navKey: "onBookshelf",
      bounds: { x: 49.22, y: 9.77, w: 18.23, h: 24.87 },
      focus: { x: 58, y: 22 },
      states: {
        starter: ZP + "bookshelf_starter.png",
        developing: ZP + "bookshelf_developing.png",
        personalized: ZP + "bookshelf_personalized.png",
      },
      resolve: (s) => s.repertoire.shelfState,
    },
    {
      id: "stove",
      label: "Cook",
      navKey: "onStove",
      bounds: { x: 36.46, y: 40.36, w: 27.34, h: 11.85 },
      focus: { x: 50, y: 46 },
      states: {
        starter: ZP + "stove_starter.png",
        // developing / skilled / wok / baker … await inpainted art
      },
      resolve: (s) => s.skillIdentity.stoveState,
    },
    // Fridge / counter / wall zones exist conceptually but have no art yet.
  ],
};

export const KITCHENS: Record<KitchenId, KitchenDefinition> = { starter_apartment: STARTER_KITCHEN };
export function getKitchen(id: KitchenId = "starter_apartment"): KitchenDefinition {
  return KITCHENS[id] ?? STARTER_KITCHEN;
}

// Resolve a zone's current image, falling back to its starter state so a missing
// variant never breaks the scene (the base region simply shows through).
export function zoneImage(zone: Zone, state: KitchenState): string | null {
  const key = zone.resolve(state);
  return zone.states[key] ?? zone.states.starter ?? null;
}

// ── Deriving state from real data (backward compatible) ──────────────────────
export function deriveKitchenState(input: { herbStage?: number; savedRecipes?: number; kitchenId?: KitchenId }): KitchenState {
  const recipes = Math.max(0, input.savedRecipes ?? 0);
  return {
    kitchenId: input.kitchenId ?? "starter_apartment",
    consistency: { herbStage: Math.max(0, Math.min(3, input.herbStage ?? 0)) },
    repertoire: { shelfState: recipes >= 3 ? "personalized" : recipes >= 1 ? "developing" : "starter" },
    skillIdentity: { stoveState: "starter" },
    memories: { fridgeState: "clean" },
    environment: { warmth: 1 },
  };
}

// Four canonical states for the architecture demo — SAME base, assembled from
// different zone-state combinations (never four flattened kitchens).
export const DEMO_STATES: { label: string; state: KitchenState }[] = [
  { label: "Day 1", state: { kitchenId: "starter_apartment", consistency: { herbStage: 0 }, repertoire: { shelfState: "starter" }, skillIdentity: { stoveState: "starter" }, memories: { fridgeState: "clean" }, environment: { warmth: 1 } } },
  { label: "Early progress", state: { kitchenId: "starter_apartment", consistency: { herbStage: 1 }, repertoire: { shelfState: "developing" }, skillIdentity: { stoveState: "starter" }, memories: { fridgeState: "clean" }, environment: { warmth: 1 } } },
  { label: "Established cook", state: { kitchenId: "starter_apartment", consistency: { herbStage: 2 }, repertoire: { shelfState: "developing" }, skillIdentity: { stoveState: "starter" }, memories: { fridgeState: "clean" }, environment: { warmth: 1 } } },
  { label: "Mature kitchen", state: { kitchenId: "starter_apartment", consistency: { herbStage: 3 }, repertoire: { shelfState: "personalized" }, skillIdentity: { stoveState: "starter" }, memories: { fridgeState: "clean" }, environment: { warmth: 1 } } },
];
