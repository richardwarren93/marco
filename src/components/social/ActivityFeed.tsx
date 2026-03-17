"use client";

import { useState } from "react";
import ActivityFeedCard from "./ActivityFeedCard";
import { FriendsIcon } from "@/components/icons/HandDrawnIcons";
import type { ActivityFeedItem } from "@/types";

interface ActivityFeedProps {
  initialItems: ActivityFeedItem[];
  hasMore: boolean;
}

export default function ActivityFeed({ initialItems, hasMore: initialHasMore }: ActivityFeedProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);

    try {
      const res = await fetch(`/api/activity-feed?offset=${items.length}&limit=10`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Load more error:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
        <div className="text-gray-300 flex justify-center mb-3">
          <FriendsIcon className="w-12 h-12" />
        </div>
        <p className="text-gray-500 text-sm font-medium">No friend activity yet</p>
        <p className="text-gray-400 text-xs mt-1">
          Add friends to see what they&apos;re cooking!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ActivityFeedCard key={item.id} item={item} />
      ))}
      {hasMore && (
        <div className="text-center py-3">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2 bg-white border border-gray-200 text-orange-600 hover:border-orange-300 hover:bg-orange-50 rounded-full text-sm font-medium transition-colors"
          >
            {loadingMore ? "Loading..." : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}
