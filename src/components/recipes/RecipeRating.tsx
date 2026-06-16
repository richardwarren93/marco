"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/hooks/use-data";
import { useToast } from "@/components/ui/Toast";

interface RatingData {
  average: number;
  count: number;
  userRating: number | null;
}

const GOLD = "#E8A33D";
const INK_SOFT = "#6B655C";

function Star({ filled, dim = false }: { filled: boolean; dim?: boolean }) {
  return (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill={filled ? GOLD : "none"} stroke={filled ? GOLD : (dim ? "#cfc7ba" : "#cfc7ba")} strokeWidth={1.6}>
      <path strokeLinejoin="round" d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 7.1-1.01L12 2z" />
    </svg>
  );
}

/**
 * Community rating widget for the recipe detail page. Shows the public average
 * + count and lets the signed-in user set their own rating (tap a star). Works
 * for both owners and the public/community view — ratings are universal.
 */
export default function RecipeRating({ recipeId }: { recipeId: string }) {
  const { data, mutate } = useSWR<RatingData>(`/api/recipes/${recipeId}/rating`, apiFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const { showToast } = useToast();
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const average = data?.average ?? 0;
  const count = data?.count ?? 0;
  const userRating = data?.userRating ?? 0;
  const display = hover || userRating;

  async function setRating(r: number) {
    if (submitting) return;
    setSubmitting(true);
    const nextCount = userRating ? count : count + 1;
    mutate({ average, count: nextCount, userRating: r }, false);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: r }),
      });
      if (!res.ok) throw new Error("failed");
      const fresh = await res.json();
      mutate(fresh, false);
    } catch {
      showToast("Couldn't save your rating");
      mutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            disabled={submitting}
            aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
            className="px-0.5 py-1 active:scale-90 transition-transform"
          >
            <Star filled={display >= n} dim={!display} />
          </button>
        ))}
      </div>
      <div className="leading-tight">
        {count > 0 ? (
          <p className="text-[13px] font-semibold" style={{ color: "#1C1A17" }}>
            {average.toFixed(1)}
            <span className="ml-1 font-normal" style={{ color: INK_SOFT }}>
              · {count} {count === 1 ? "rating" : "ratings"}
            </span>
          </p>
        ) : (
          <p className="text-[12.5px]" style={{ color: INK_SOFT }}>Be the first to rate</p>
        )}
        {userRating > 0 && (
          <p className="text-[11px]" style={{ color: GOLD }}>Your rating: {userRating}★</p>
        )}
      </div>
    </div>
  );
}
