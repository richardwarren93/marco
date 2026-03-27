"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RatingStars({ sourceUrl }: { sourceUrl: string }) {
  const supabase = createClient();
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hovering, setHovering] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchRatings() {
      // Fetch all ratings for this source_url
      const { data: ratings } = await supabase
        .from("recipe_ratings")
        .select("*")
        .eq("source_url", sourceUrl);

      if (ratings && ratings.length > 0) {
        const total = ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0);
        setAverage(total / ratings.length);
        setCount(ratings.length);
      }

      // Fetch current user's rating
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: myRating } = await supabase
          .from("recipe_ratings")
          .select("rating")
          .eq("source_url", sourceUrl)
          .eq("user_id", user.id)
          .single();
        if (myRating) {
          setUserRating(myRating.rating);
        }
      }
    }
    fetchRatings();
  }, [sourceUrl]);

  async function handleRate(rating: number) {
    setSaving(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: sourceUrl, rating }),
      });

      if (res.ok) {
        setUserRating(rating);
        // Refetch to update average
        const { data: ratings } = await supabase
          .from("recipe_ratings")
          .select("*")
          .eq("source_url", sourceUrl);
        if (ratings && ratings.length > 0) {
          const total = ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0);
          setAverage(total / ratings.length);
          setCount(ratings.length);
        }
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = hovering ? star <= hovering : star <= userRating;
          return (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHovering(star)}
              onMouseLeave={() => setHovering(0)}
              disabled={saving}
              className={`text-xl transition-colors ${
                filled ? "text-orange-400" : "text-gray-300"
              } hover:text-orange-400 disabled:opacity-50`}
            >
              &#9733;
            </button>
          );
        })}
      </div>
      <span className="text-sm text-gray-500">
        {count > 0
          ? `${average.toFixed(1)} avg (${count} ${count === 1 ? "rating" : "ratings"})`
          : "No ratings yet"}
      </span>
    </div>
  );
}
