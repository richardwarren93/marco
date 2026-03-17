"use client";

import Link from "next/link";
import { relativeTime } from "@/lib/gamification";
import { FriendsIcon, CookingPotIcon } from "@/components/icons/HandDrawnIcons";

interface FriendCookingItem {
  id: string;
  friendName: string;
  cookedAt: string;
  recipe: {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    image_url: string | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    servings: number | null;
  };
}

interface FriendsCookingSectionProps {
  items: FriendCookingItem[];
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

export default function FriendsCookingSection({
  items,
}: FriendsCookingSectionProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-2xl shadow-sm">
        <div className="text-gray-300 flex justify-center mb-3">
          <FriendsIcon className="w-10 h-10" />
        </div>
        <p className="text-gray-500 text-sm">No friends cooking recently</p>
        <p className="text-gray-400 text-xs mt-1">
          Add friends to see what they&apos;re making!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CookingPotIcon className="w-5 h-5 text-orange-600" />
        <h2 className="text-lg font-bold text-gray-900">
          Friends Are Cooking
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4 scrollbar-hide">
        {items.map((item) => {
          const initials = getInitials(item.friendName);
          const color = getAvatarColor(item.friendName);

          return (
            <Link
              key={item.id}
              href={`/recipes/${item.recipe.id}`}
              className="flex-shrink-0 w-56 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 snap-start hover:shadow-md transition-shadow"
            >
              {/* Friend info */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0`}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">
                    {item.friendName}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {relativeTime(item.cookedAt)}
                  </p>
                </div>
              </div>

              {/* Recipe */}
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                {item.recipe.title}
              </h3>
              {item.recipe.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  {item.recipe.description}
                </p>
              )}

              {/* Tags */}
              {item.recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.recipe.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="bg-orange-50 text-orange-600 text-[9px] px-1.5 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                {item.recipe.prep_time_minutes && (
                  <span>{item.recipe.prep_time_minutes}m prep</span>
                )}
                {item.recipe.cook_time_minutes && (
                  <span>{item.recipe.cook_time_minutes}m cook</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
