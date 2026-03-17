"use client";

import Link from "next/link";
import type { ActivityFeedItem } from "@/types";
import { relativeTime } from "@/lib/gamification";
import { CookingPotIcon, RecipesIcon, GoalIcon } from "@/components/icons/HandDrawnIcons";

interface ActivityFeedCardProps {
  item: ActivityFeedItem;
}

const activityIcons: Record<string, typeof CookingPotIcon> = {
  cooked_recipe: CookingPotIcon,
  saved_recipe: RecipesIcon,
  completed_goal: GoalIcon,
};

const activityVerbs: Record<string, string> = {
  cooked_recipe: "cooked",
  saved_recipe: "saved",
  completed_goal: "completed their weekly goal",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Deterministic color from name
const avatarColors = [
  "from-orange-400 to-amber-500",
  "from-purple-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-rose-400 to-pink-500",
  "from-indigo-400 to-violet-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function ActivityFeedCard({ item }: ActivityFeedCardProps) {
  const Icon = activityIcons[item.activity_type] || RecipesIcon;
  const verb = activityVerbs[item.activity_type] || "did something with";
  const displayName = item.profile?.display_name || "Someone";
  const initials = getInitials(displayName);
  const color = getAvatarColor(displayName);

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0`}>
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{displayName}</span>{" "}
          {verb}{" "}
          {item.recipe && (
            <Link
              href={`/recipes/${item.recipe.id}`}
              className="font-medium text-orange-600 hover:text-orange-700"
            >
              {item.recipe.title}
            </Link>
          )}
          {item.activity_type === "completed_goal" && (
            <span className="text-green-600 font-medium"> 🎉</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{relativeTime(item.created_at)}</p>
      </div>

      {/* Icon */}
      <Icon className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
    </div>
  );
}
