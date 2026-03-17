"use client";

import Link from "next/link";
import type { ActivityFeedItem } from "@/types";
import { relativeTime } from "@/lib/gamification";
import { GoalIcon } from "@/components/icons/HandDrawnIcons";
import FeedVoteButtons from "./FeedVoteButtons";

interface ActivityFeedCardProps {
  item: ActivityFeedItem;
}

const avatarColors = [
  "from-orange-400 to-amber-500",
  "from-purple-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-rose-400 to-pink-500",
  "from-indigo-400 to-violet-500",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// Gradient placeholders when no photo
const placeholderGradients = [
  "from-orange-400 via-rose-400 to-pink-400",
  "from-violet-400 via-purple-400 to-indigo-400",
  "from-emerald-400 via-teal-400 to-cyan-400",
  "from-amber-400 via-orange-400 to-red-400",
  "from-sky-400 via-blue-400 to-indigo-400",
];

function getPlaceholderGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return placeholderGradients[Math.abs(hash) % placeholderGradients.length];
}

const foodEmojis = ["🍳", "🥘", "🍲", "🍝", "🍜", "🥗", "🍔", "🌮", "🍕", "🥙"];

function getRandomEmoji(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return foodEmojis[Math.abs(hash) % foodEmojis.length];
}

export default function ActivityFeedCard({ item }: ActivityFeedCardProps) {
  const displayName = item.profile?.display_name || "Someone";
  const initials = getInitials(displayName);
  const color = getAvatarColor(displayName);

  // Goal completion gets a special celebration card
  if (item.activity_type === "completed_goal") {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0`}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
            <p className="text-[11px] text-gray-400">{relativeTime(item.created_at)}</p>
          </div>
          <GoalIcon className="w-6 h-6 text-amber-500" />
        </div>
        <div className="text-center py-4">
          <span className="text-3xl">🎉</span>
          <p className="text-sm font-semibold text-amber-800 mt-2">
            Completed their weekly cooking goal!
          </p>
        </div>
        <FeedVoteButtons
          activityId={item.id}
          initialUpvotes={item.upvotes || 0}
          initialDownvotes={item.downvotes || 0}
          initialUserVote={item.userVote || null}
        />
      </div>
    );
  }

  // Regular cooked / saved recipe cards — visual & social
  const hasImage = !!item.image_url;
  const recipeImage = item.recipe?.image_url;
  const displayImage = item.image_url || recipeImage;

  const activityText =
    item.activity_type === "cooked_recipe" ? "cooked" : "saved";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header: Avatar + Name + Time */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
        <div
          className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
          <p className="text-[11px] text-gray-400">
            {activityText}{" "}
            {item.recipe ? (
              <span className="text-gray-500">{item.recipe.title}</span>
            ) : (
              "a recipe"
            )}{" "}
            · {relativeTime(item.created_at)}
          </p>
        </div>
      </div>

      {/* Photo Area */}
      {displayImage ? (
        <div className="mx-3 mt-1 mb-2 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImage}
            alt={item.recipe?.title || "Cooking photo"}
            className="w-full aspect-[4/3] object-cover"
          />
        </div>
      ) : (
        <div
          className={`mx-3 mt-1 mb-2 rounded-xl bg-gradient-to-br ${getPlaceholderGradient(item.id)} flex items-center justify-center aspect-[4/3]`}
        >
          <span className="text-6xl opacity-60">{getRandomEmoji(item.id)}</span>
        </div>
      )}

      {/* Caption */}
      {item.caption && (
        <p className="px-4 text-sm text-gray-700 mb-2">{item.caption}</p>
      )}

      {/* Recipe tags */}
      {item.recipe?.tags && item.recipe.tags.length > 0 && (
        <div className="px-4 flex flex-wrap gap-1 mb-2">
          {item.recipe.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions row: Votes + View Recipe */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <FeedVoteButtons
          activityId={item.id}
          initialUpvotes={item.upvotes || 0}
          initialDownvotes={item.downvotes || 0}
          initialUserVote={item.userVote || null}
        />

        {item.recipe && (
          <Link
            href={`/recipes/${item.recipe.id}`}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            View Recipe →
          </Link>
        )}
      </div>
    </div>
  );
}
