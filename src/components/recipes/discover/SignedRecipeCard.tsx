"use client";

import { MealTypeIcon } from "@/components/icons/MealIcons";
import { ActionButton, type SharedCardAction } from "@/components/recipes/SharedRecipeCard";

/**
 * The Friends-feed card. Per the brand doc, "every recipe is signed by
 * who passed it on. The hand becomes the social currency: a recipe with
 * three signatures has been loved by three cooks." This card renders the
 * signed-recipe pattern across three kinds:
 *
 *   - "saved":   {friend} saved this. Shows the recipe image.
 *   - "planned": {friend} is cooking this on {day}. Stacks signatures
 *                when multiple friends are planning the same recipe.
 *   - "made":    {friend} cooked this — "{caption}". The cook photo
 *                replaces the recipe's stock image.
 */

export type FriendsFeedItem = {
  /** Unique key — composite of kind+id so a single recipe can appear in multiple sections. */
  id: string;
  kind: "saved" | "planned" | "made";
  recipeId: string;
  title: string;
  imageUrl: string | null;
  ownerName: string;
  ownerAvatar: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  mealType: string | null;
  createdAt: string;
  /** kind === "planned" — when the meal is on the calendar */
  plannedDate?: string | null;
  /** kind === "planned" — additional friends planning the same recipe */
  planningFriends?: { name: string; avatar: string | null }[];
  /** kind === "made" — caption the friend wrote on their cook photo */
  caption?: string | null;
};

interface Props {
  item: FriendsFeedItem;
  onTap: (recipeId: string) => void;
  /** Top-right overlay actions (bookmark / plus) — matches My Recipes pattern. */
  actions?: SharedCardAction[];
  /** Stagger animation index */
  index?: number;
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const day = 86400000;
  const days = Math.floor(diffMs / day);
  if (days < 0) return formatPlannedDay(dateStr);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  }
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatPlannedDay(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.length === 10 ? "T12:00:00" : ""));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86400000);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  }
  if (diffDays < 14) {
    return "next " + d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  }
  return `in ${Math.floor(diffDays / 7)} weeks`;
}

export default function SignedRecipeCard({
  item,
  onTap,
  actions,
  index = 0,
}: Props) {
  const totalTime = (item.prepMinutes ?? 0) + (item.cookMinutes ?? 0);
  const microline =
    item.kind === "saved"
      ? `saved ${formatRelative(item.createdAt)}`
      : item.kind === "planned"
        ? `planning this for ${item.plannedDate ? formatPlannedDay(item.plannedDate) : "soon"}`
        : item.caption
          ? `made this — “${item.caption}”`
          : "made this";

  const allSignatures = item.kind === "planned" && item.planningFriends && item.planningFriends.length > 0
    ? [{ name: item.ownerName, avatar: item.ownerAvatar }, ...item.planningFriends.filter((f) => f.name !== item.ownerName)]
    : [{ name: item.ownerName, avatar: item.ownerAvatar }];
  const dedupedSignatures = Array.from(
    new Map(allSignatures.map((s) => [s.name, s])).values()
  );

  return (
    <article
      className="rounded-2xl bg-white overflow-hidden cursor-pointer select-none transition-transform duration-200 active:scale-[0.985]"
      style={{
        boxShadow: "0 2px 12px rgba(20,12,5,0.06)",
        border: "1px solid var(--line, rgba(28,26,23,0.12))",
        animation: `cardPop 0.4s ease ${index * 40}ms both`,
      }}
      onClick={() => onTap(item.recipeId)}
    >
      {/* 16:9 image */}
      <div className="relative w-full" style={{ aspectRatio: "16 / 9", background: "var(--cream-warm, #EFE5D2)" }}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 35% 40%, var(--mustard, #E8A33D) 0%, transparent 45%), radial-gradient(circle at 70% 70%, var(--tomato, #E5462E) 0%, transparent 40%), var(--cream-warm, #EFE5D2)",
            }}
          >
            <MealTypeIcon type={item.mealType} className="opacity-50" size={42} strokeWidth={1.5} />
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            {actions.map((action, i) => (
              <ActionButton key={i} action={action} />
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-4">
        {/* Title — Fraunces, not italic (italic reserved for editorial pulls) */}
        <h3
          className="line-clamp-2"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
            fontSize: "18px",
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
            color: "var(--ink, #1C1A17)",
          }}
        >
          {item.title}
        </h3>

        {/* Signature row — Caveat with tomato punctum. Stacks for multi-signed recipes. */}
        <div className="flex items-baseline gap-2 mt-2 flex-wrap">
          {dedupedSignatures.map((sig, i) => (
            <span
              key={sig.name + i}
              className="marco-signature"
              style={{ fontSize: "1.15rem", color: "var(--ink, #1C1A17)" }}
            >
              ~{sig.name.toLowerCase().split(" ")[0]}
            </span>
          ))}
        </div>

        {/* Editorial micro-line — Fraunces italic */}
        <p
          className="mt-2"
          style={{
            fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
            fontStyle: "italic",
            fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
            fontSize: "13.5px",
            color: "var(--ink-soft, #4A4742)",
            lineHeight: 1.4,
          }}
        >
          {microline}
        </p>

        {/* Mono metadata — time · meal_type */}
        {(totalTime > 0 || item.mealType) && (
          <div
            className="flex items-center gap-1.5 mt-3 pt-3"
            style={{
              borderTop: "1px solid var(--line, rgba(28,26,23,0.12))",
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              fontSize: "10px",
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-soft, #4A4742)",
              fontWeight: 500,
            }}
          >
            {totalTime > 0 && <span>{totalTime} min</span>}
            {totalTime > 0 && item.mealType && <span style={{ opacity: 0.4 }}>{"·"}</span>}
            {item.mealType && <span>{item.mealType}</span>}
          </div>
        )}
      </div>
    </article>
  );
}
