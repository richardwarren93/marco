"use client";

import { useState } from "react";
import { CookingPotIcon, TomatoIcon } from "@/components/icons/HandDrawnIcons";
import PhotoUpload from "@/components/social/PhotoUpload";

interface IMadeThisButtonProps {
  recipeId: string;
  onCooked?: (result: {
    tomatoesEarned: number;
    goalJustCompleted: boolean;
    weekProgress: number;
    tomatoBalance: number;
  }) => void;
  onPhotoAdded?: () => void;
}

export default function IMadeThisButton({ recipeId, onCooked, onPhotoAdded }: IMadeThisButtonProps) {
  const [loading, setLoading] = useState(false);
  const [justCooked, setJustCooked] = useState(false);
  const [tomatoesEarned, setTomatoesEarned] = useState(0);
  const [showFloat, setShowFloat] = useState(false);
  const [cookingLogId, setCookingLogId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoPosted, setPhotoPosted] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/cooking-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      setTomatoesEarned(data.tomatoesEarned);
      setJustCooked(true);
      setShowFloat(true);
      setCookingLogId(data.cookingLogId || data.log?.id || null);
      setActivityId(data.activityId || null);

      // Hide float animation after 1.5s
      setTimeout(() => setShowFloat(false), 1500);

      onCooked?.(data);
    } catch (error) {
      console.error("Cook log error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUploaded(imageUrl: string, caption: string) {
    if (!cookingLogId) return;

    try {
      // Save photo to cooking_log
      await fetch("/api/cooking-log/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cooking_log_id: cookingLogId,
          image_url: imageUrl,
          caption,
        }),
      });

      // Also update activity_feed entry if it exists
      if (activityId) {
        await fetch("/api/activity-feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity_id: activityId,
            image_url: imageUrl,
            caption,
          }),
        });
      }

      setPhotoPosted(true);
      setShowPhotoUpload(false);
      onPhotoAdded?.();
    } catch (error) {
      console.error("Photo post error:", error);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={loading || justCooked}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-sm transition-all duration-200 ${
          justCooked
            ? "bg-green-50 text-green-700 border-2 border-green-200"
            : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-sm hover:shadow-md"
        } ${loading ? "opacity-70" : ""}`}
      >
        {justCooked ? (
          <>
            <CookingPotIcon className="w-5 h-5" />
            Cooked today!
            <span className="ml-1 flex items-center gap-0.5 text-xs font-normal">
              +{tomatoesEarned} <TomatoIcon className="w-3.5 h-3.5 text-red-500" filled />
            </span>
          </>
        ) : (
          <>
            <CookingPotIcon className="w-5 h-5" />
            {loading ? "Logging..." : "I Made This!"}
            <span className="ml-1 flex items-center gap-0.5 text-xs opacity-80">
              +10 <TomatoIcon className="w-3.5 h-3.5" />
            </span>
          </>
        )}
      </button>

      {/* Floating tomato animation */}
      {showFloat && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 animate-float-up pointer-events-none flex items-center gap-1 text-red-500 font-bold text-lg">
          +{tomatoesEarned} <TomatoIcon className="w-5 h-5" filled />
        </div>
      )}

      {/* Photo upload prompt — appears after cooking */}
      {justCooked && cookingLogId && !showPhotoUpload && !photoPosted && (
        <button
          onClick={() => setShowPhotoUpload(true)}
          className="w-full mt-2 py-2 text-sm text-orange-600 hover:text-orange-700 font-medium hover:bg-orange-50 rounded-xl transition-colors"
        >
          📸 Add a photo of your dish
        </button>
      )}

      {photoPosted && (
        <p className="mt-2 text-center text-xs text-green-600 font-medium">
          Photo saved!
        </p>
      )}

      {showPhotoUpload && (
        <PhotoUpload
          onUploaded={handlePhotoUploaded}
          onCancel={() => setShowPhotoUpload(false)}
        />
      )}
    </div>
  );
}
