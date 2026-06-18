"use client";

import { useState } from "react";
import { CookingPotIcon } from "@/components/icons/HandDrawnIcons";
import PhotoUpload from "@/components/social/PhotoUpload";
import { useToast } from "@/components/ui/Toast";

/** Show a "🍅 +N" earn toast and refresh any header balance, when an award fired. */
function surfaceEarn(showToast: ReturnType<typeof useToast>["showToast"], data: { awarded?: boolean; tomatoesEarned?: number; tomatoBalance?: number }) {
  if (data?.awarded && (data.tomatoesEarned ?? 0) > 0) {
    showToast(`🍅 +${data.tomatoesEarned}`, { variant: "success" });
    window.dispatchEvent(new CustomEvent("tomatoes:earned", { detail: { balance: data.tomatoBalance } }));
  }
}

interface IMadeThisButtonProps {
  recipeId: string;
  /** When confirming a planned meal, link the cook to its meal-plan slot (one award per slot). */
  mealPlanId?: string;
  /** Override the call-to-action label (e.g. "Cooked it" on the meal plan). */
  label?: string;
  onCooked?: (result: {
    tomatoesEarned: number;
    awarded?: boolean;
    goalJustCompleted: boolean;
    weekProgress: number;
    tomatoBalance: number;
  }) => void;
  onPhotoAdded?: () => void;
  variant?: "default" | "pill";
}

export default function IMadeThisButton({ recipeId, mealPlanId, label = "I Made This", onCooked, onPhotoAdded, variant = "default" }: IMadeThisButtonProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [justCooked, setJustCooked] = useState(false);
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
        body: JSON.stringify({ recipe_id: recipeId, ...(mealPlanId ? { meal_plan_id: mealPlanId } : {}) }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      setJustCooked(true);
      setCookingLogId(data.cookingLogId || data.log?.id || null);
      setActivityId(data.activityId || null);

      surfaceEarn(showToast, data);
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
      const photoRes = await fetch("/api/cooking-log/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cooking_log_id: cookingLogId,
          image_url: imageUrl,
          caption,
        }),
      });
      surfaceEarn(showToast, await photoRes.json().catch(() => ({})));

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
        className={`flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${
          variant === "pill"
            ? `px-5 py-2 rounded-full text-xs ${
                justCooked
                  ? "bg-[var(--teal,#0F4C5C)]/10 text-[var(--teal-deep,#082E38)] border border-[var(--teal,#0F4C5C)]/30"
                  : "bg-[#1C1A17]/5 text-[#1C1A17]/60 hover:bg-[#1C1A17]/10 border border-[#1C1A17]/10"
              }`
            : `w-full py-3 px-4 rounded-2xl text-sm ${
                justCooked
                  ? "bg-[var(--teal,#0F4C5C)]/10 text-[var(--teal-deep,#082E38)] border-2 border-[var(--teal,#0F4C5C)]/30"
                  : "bg-[var(--tomato,#E5462E)] text-white hover:bg-[var(--tomato-dark,#B8331E)] shadow-sm hover:shadow-md"
              }`
        } ${loading ? "opacity-70" : ""}`}
      >
        {justCooked ? (
          <>
            <CookingPotIcon className="w-4 h-4" />
            Cooked today!
          </>
        ) : (
          <>
            <CookingPotIcon className="w-4 h-4" />
            {loading ? "Logging..." : label}
          </>
        )}
      </button>

      {/* Photo upload prompt — appears after cooking */}
      {justCooked && cookingLogId && !showPhotoUpload && !photoPosted && (
        <button
          onClick={() => setShowPhotoUpload(true)}
          className="w-full mt-2 py-2 text-sm text-[var(--tomato,#E5462E)] hover:text-[var(--tomato-dark,#B8331E)] font-medium hover:bg-orange-50 rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Add a photo of your dish
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
