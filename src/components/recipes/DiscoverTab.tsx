"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DiscoverToggle, { type DiscoverTab as ToggleTab } from "./discover/DiscoverToggle";
import FriendsFeed from "./discover/FriendsFeed";
import CommunityFeed from "./discover/CommunityFeed";

const STORAGE_KEY = "marco:discover-tab";

// ─── Main component ─────────────────────────────────────────────────────────

export default function DiscoverTab({
  onAddToCollection,
}: {
  onAddToMealPlan?: (recipeId: string) => void;
  onAddToCollection?: (recipeId: string) => void;
}) {
  const router = useRouter();

  // Toggle state — defaults to Friends, remembers last choice in localStorage.
  const [active, setActive] = useState<ToggleTab>("friends");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "friends" || stored === "community") {
        setActive(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleTabChange = useCallback((tab: ToggleTab) => {
    setActive(tab);
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {
      /* ignore */
    }
  }, []);

  const handleTap = useCallback(
    (recipeId: string) => {
      router.push(`/recipes/${recipeId}`);
    },
    [router]
  );

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-5"
      style={{
        background: "var(--cream, #F5EEE2)",
        paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)",
      }}
    >
      <DiscoverToggle active={active} onChange={handleTabChange} />

      {active === "friends" ? (
        <FriendsFeed
          onTap={handleTap}
          onSwitchToCommunity={() => handleTabChange("community")}
          onAddToCollection={onAddToCollection}
        />
      ) : (
        <CommunityFeed
          onTap={handleTap}
          onAddToCollection={onAddToCollection}
        />
      )}
    </div>
  );
}
