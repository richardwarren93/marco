"use client";
import { useSyncExternalStore } from "react";

// A tiny shared signal so surfaces can tell when the guide is actively running
// and step out of its way (hide their own redundant nudges), keeping the
// guide's spotlight the one clear thing on screen.
let active = false;
const listeners = new Set<() => void>();

export const guideStore = {
  set(v: boolean) { if (v !== active) { active = v; listeners.forEach((l) => l()); } },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  snapshot: () => active,
};

export function useGuideActive(): boolean {
  return useSyncExternalStore(guideStore.subscribe, guideStore.snapshot, () => false);
}
