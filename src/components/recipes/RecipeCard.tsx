"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Recipe } from "@/types";
import { MealTypeIcon } from "@/components/icons/MealIcons";
import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_SOFT, LIME, MUSTARD, PAPER, PINK, TOMATO } from "@/lib/theme";

/* The same card as before, in the app's own language. It renders on eleven
 * surfaces, so everything here is drawn from CollectionCard — ink edge, hard
 * shadow, stuck-on tags on the art — rather than invented for this file. */

const PLATFORM: Record<string, { background: string; color: string; label: string }> = {
  instagram: { background: PINK, color: INK, label: "IG" },
  tiktok: { background: INK, color: PAPER, label: "TikTok" },
  youtube: { background: TOMATO, color: PAPER, label: "YT" },
  other: { background: MUSTARD, color: INK, label: "Link" },
};

/* Placeholder fills, picked off the meal type so a grid of imageless recipes
 * does not come out all one colour. */
const MEAL_FILL: Record<string, string> = {
  breakfast: BUTTER,
  lunch: LIME,
  dinner: MUSTARD,
  snack: PINK,
};

/* "270 min" is a number you have to do arithmetic on. Anything over an hour
   reads as hours here; the detail page still gives the prep/cook split. */
function formatTime(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [imgError, setImgError] = useState(false);

  const platform =
    recipe.source_platform && recipe.source_platform !== "other"
      ? PLATFORM[recipe.source_platform] ?? PLATFORM.other
      : null;

  const tags = recipe.tags || [];
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  /* One chip, one set of styles, on both the image and the placeholder. The two
     branches used to style this differently — white-on-black over a photo,
     grey-on-white over the placeholder — so the same recipe changed appearance
     depending on whether its image loaded. */
  const mealChip = recipe.meal_type ? (
    <span
      className="absolute top-1.5 right-1.5 px-2 py-0.5 capitalize"
      style={{
        background: INK,
        color: PAPER,
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: 10,
        borderRadius: 99,
        transform: "rotate(-2deg)",
      }}
    >
      {recipe.meal_type}
    </span>
  ) : null;

  const platformChip = platform ? (
    <span
      className="absolute top-1.5 left-1.5 px-1.5"
      style={{
        background: platform.background,
        color: platform.color,
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        border: `1.5px solid ${INK}`,
        borderRadius: 99,
        paddingTop: 1,
        paddingBottom: 1,
        transform: "rotate(-3deg)",
      }}
    >
      {platform.label}
    </span>
  ) : null;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block overflow-hidden active:scale-[0.98] transition-transform"
      style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
    >
      {recipe.image_url && !imgError ? (
        <div className="relative h-40" style={{ background: PAPER, borderBottom: `2.5px solid ${INK}` }}>
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {platformChip}
          {mealChip}
        </div>
      ) : (
        <div
          className="relative h-24 flex items-center justify-center"
          style={{
            /* No meal type gets the neutral fill rather than a sticker: with
               nothing to say, MealTypeIcon falls back to its generic glyph,
               and a loud yellow card behind it reads as a state rather than
               as an absence. */
            background: MEAL_FILL[recipe.meal_type ?? ""] ?? CREAM_WARM,
            borderBottom: `2.5px solid ${INK}`,
          }}
        >
          {/* The app's own icon in ink, for the reason CollectionCard gives:
              an emoji brings its own palette and fights the sticker behind it. */}
          <span
            style={{
              color: INK,
              opacity: recipe.meal_type ? 1 : 0.45,
              transform: "rotate(-6deg)",
              display: "inline-flex",
            }}
          >
            <MealTypeIcon type={recipe.meal_type} className="w-9 h-9" strokeWidth={1.7} />
          </span>
          {platformChip}
          {mealChip}
        </div>
      )}

      <div className="p-3">
        <h3
          className="line-clamp-2"
          style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, lineHeight: 1.15, letterSpacing: "-0.01em" }}
        >
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: INK_SOFT }}>
            {recipe.description}
          </p>
        )}

        {/* Total time rather than prep and cook separately: at 375px in a
            two-up grid there is room for one figure, and the detail page is
            where the split belongs. */}
        {(totalTime > 0 || recipe.servings) && (
          <div className="flex items-center gap-1.5 mt-2 text-[11.5px]" style={{ color: INK_SOFT }}>
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 7v5l3 2" />
                </svg>
                {formatTime(totalTime)}
              </span>
            )}
            {totalTime > 0 && recipe.servings ? <span style={{ opacity: 0.4 }}>·</span> : null}
            {recipe.servings ? <span>{recipe.servings} servings</span> : null}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5"
                style={{ background: PAPER, color: INK, border: `1.5px solid ${INK}`, borderRadius: 99, fontWeight: 600 }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
