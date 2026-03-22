"use client";

import { useEffect, useState } from "react";
import type { Recipe } from "@/types";
import FeedRecipeCard from "@/components/social/FeedRecipeCard";
import Link from "next/link";

interface FeedItem {
  id: string;
  recipe: Recipe;
  author: {
    display_name: string | null;
    avatar_url: string | null;
  };
  shared_at: string;
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed(cursor?: string) {
    const url = cursor ? `/api/feed?cursor=${cursor}` : "/api/feed";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (cursor) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setNextCursor(data.nextCursor);
    }
    setLoading(false);
    setLoadingMore(false);
  }

  function handleLoadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    fetchFeed(nextCursor);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading feed...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Feed</h1>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-3">
            Your feed is empty. Follow people to see their shared recipes here.
          </p>
          <Link
            href="/recipes"
            className="text-orange-600 hover:underline font-medium"
          >
            Browse recipes
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <FeedRecipeCard
              key={item.id}
              recipe={item.recipe}
              author={item.author}
              sharedAt={item.shared_at}
              authorId={item.recipe.user_id}
            />
          ))}

          {nextCursor && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
