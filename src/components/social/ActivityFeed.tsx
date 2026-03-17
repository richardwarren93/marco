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
      <div className="text-center py-8 bg-white rounded-2xl shadow-sm">
        <div className="text-gray-300 flex justify-center mb-3">
          <FriendsIcon className="w-10 h-10" />
        </div>
        <p className="text-gray-500 text-sm">No friend activity yet</p>
        <p className="text-gray-400 text-xs mt-1">
          Add friends to see what they&apos;re cooking!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm px-4">
      <div className="divide-y divide-gray-50">
        {items.map((item) => (
          <ActivityFeedCard key={item.id} item={item} />
        ))}
      </div>
      {hasMore && (
        <div className="py-3 text-center border-t border-gray-50">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            {loadingMore ? "Loading..." : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}
