"use client";

import { MealTypeIcon } from "@/components/icons/MealIcons";

/**
 * Light Discover card — the redesigned Discover surface (image on top, text
 * below on a white card) per the mockup. Distinct from SharedRecipeCard's
 * dark full-bleed editorial style which the rest of the app still uses.
 *
 * Shows a community rating chip (gold star + average) or a "New" pill when a
 * recipe has no ratings yet. Save (bookmark) + Add-to-collection (plus) live as
 * glassy buttons over the image.
 */

export interface DiscoverCardData {
  recipeId: string;
  title: string;
  image_url: string | null;
  meal_type: string;
  totalTime: number;
  rating: { average: number; count: number };
}

interface Props {
  recipe: DiscoverCardData;
  onTap: () => void;
  onSave: () => void;
  onAddToCollection?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  index?: number;
  /** When set, shows a "Saved by <name>" overlay on the image (Friends' Favorites)
   *  and hides the community rating chip. */
  savedByName?: string;
  savedByAvatar?: string | null;
}

const INK = "#1C1A17";
const INK_SOFT = "#4A4742";

export default function DiscoverRecipeCard({
  recipe,
  onTap,
  onSave,
  onAddToCollection,
  isSaved = false,
  isSaving = false,
  index = 0,
  savedByName,
  savedByAvatar,
}: Props) {
  const { title, image_url, meal_type, totalTime, rating } = recipe;
  const metaParts = [totalTime > 0 ? `${totalTime} min` : null, meal_type].filter(Boolean);
  const firstName = savedByName ? savedByName.trim().split(" ")[0] : "";

  return (
    <div
      onClick={onTap}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none active:scale-[0.98] transition-transform duration-200"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 2px 12px rgba(20,12,5,0.07)",
        animation: `cardPop 0.4s ease ${index * 40}ms both`,
      }}
    >
      {/* ── Image ─────────────────────────────────────────────── */}
      <div className="relative w-full" style={{ aspectRatio: "4 / 3", background: "#eeece8" }}>
        {image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_url}
            alt={title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 35% 40%, var(--mustard, #E8A33D) 0%, transparent 45%), radial-gradient(circle at 70% 70%, var(--tomato, #E5462E) 0%, transparent 40%), var(--cream-warm, #EFE5D2)",
            }}
          >
            <MealTypeIcon type={meal_type} className="opacity-50" size={40} strokeWidth={1.5} />
          </div>
        )}

        {/* Save + Add buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            disabled={isSaving}
            aria-label={isSaved ? "Saved" : "Save recipe"}
            className="w-7 h-7 flex items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90"
            style={{ background: isSaved ? "var(--tomato, #E5462E)" : "rgba(255,255,255,0.85)" }}
          >
            {isSaving ? (
              <div className="w-3 h-3 border-[1.5px] rounded-full animate-spin" style={{ borderColor: isSaved ? "#fff" : INK, borderTopColor: "transparent" }} />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isSaved ? "#fff" : "none"} stroke={isSaved ? "#fff" : INK} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
          </button>
          {onAddToCollection && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCollection(); }}
              aria-label="Add to collection"
              className="w-7 h-7 flex items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.85)" }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Saved-by overlay (Friends' Favorites) */}
        {firstName && (
          <div
            className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5"
            style={{ background: "rgba(20,12,5,0.55)", backdropFilter: "blur(4px)" }}
          >
            <span
              className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
              style={{ width: 20, height: 20, background: "var(--tomato, #E5462E)" }}
            >
              {savedByAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={savedByAvatar} alt={firstName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff" }}>
                  {firstName.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#fff" }}>
              Saved by {firstName}
            </span>
          </div>
        )}
      </div>

      {/* ── Text ─────────────────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-3">
        <h4
          className="line-clamp-2"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 40, "wght" 600',
            fontSize: "13.5px",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            color: INK,
            minHeight: "2.4em",
          }}
        >
          {title}
        </h4>
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: "9.5px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: INK_SOFT,
            fontWeight: 500,
          }}
        >
          {metaParts.join(" · ")}
        </p>
        <div className="mt-1.5 flex items-center gap-1" style={{ display: savedByName ? "none" : undefined }}>
          {rating.count > 0 ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#E8A33D">
                <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 7.1-1.01L12 2z" />
              </svg>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: INK }}>
                {rating.average.toFixed(1)}
              </span>
              {rating.count > 1 && (
                <span style={{ fontSize: "10.5px", color: "#a8a29a" }}>({rating.count})</span>
              )}
            </>
          ) : (
            <span
              className="px-1.5 py-0.5 rounded-full"
              style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--cream-warm, #EFE5D2)", color: INK_SOFT }}
            >
              New
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
