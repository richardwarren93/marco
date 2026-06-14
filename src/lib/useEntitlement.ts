"use client";

// Client hook for the caller's Marco Plus entitlement. Fetches /api/entitlement
// once and caches it on the module so multiple components share one request.
// Used to show locks / remaining counts and to decide when to surface the
// contextual paywall. `null` limit values mean "unlimited".

import { useEffect, useState } from "react";
import type { Tier } from "./entitlements";

export interface EntitlementLimits {
  maxSavedRecipes: number | null;
  mealPlanWeeksAhead: number | null;
  groceryAutoBuild: boolean;
  sousChefPerMonth: number | null;
  aiSearchPerDay: number | null;
  aiDiscoverPerDay: number | null;
}

export interface Entitlement {
  tier: Tier;
  isPlus: boolean;
  enforced: boolean;
  limits: EntitlementLimits;
  usage: { savedRecipes: number };
}

let cache: Entitlement | null = null;
let inflight: Promise<Entitlement | null> | null = null;

async function load(): Promise<Entitlement | null> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/entitlement");
      if (!res.ok) return null;
      cache = (await res.json()) as Entitlement;
      return cache;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Force a refetch (e.g. right after a successful purchase in Phase 2). */
export function invalidateEntitlement() {
  cache = null;
}

export function useEntitlement() {
  const [data, setData] = useState<Entitlement | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) {
      setData(cache);
      setLoading(false);
      return;
    }
    load().then((e) => {
      if (!active) return;
      setData(e);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    entitlement: data,
    loading,
    isPlus: data?.isPlus ?? false,
    // While loading or on error, treat as free for UX (locks show), but note
    // server gates are the real enforcement.
    tier: data?.tier ?? ("free" as Tier),
  };
}
