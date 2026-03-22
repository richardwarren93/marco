"use client";

import Link from "next/link";
import type { Recipe } from "@/types";

interface FeedRecipeCardProps {
  recipe: Recipe;
  author: {
    display_name: string | null;
    avatar_url: string | null;
  };
  sharedAt: string;
  authorId: string;
}

export default function FeedRecipeCard({
  recipe,
  author,
  sharedAt,
  authorId,
}: FeedRecipeCardProps) {
  const timeAgo = getTimeAgo(sharedAt);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Author header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <Link href={`/profile/${authorId}`}>
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-sm flex-shrink-0">
            {(author.display_name || "?")[0].toUpperCase()}
          </div>
        </Link>
        <div className="min-w-0">
          <Link
            href={`/profile/${authorId}`}
            className="text-sm font-medium text-gray-900 hover:underline"
          >
            {author.display_name || "Anonymous"}
          </Link>
          <span className="text-sm text-gray-500"> shared a recipe</span>
          <span className="text-xs text-gray-400 ml-2">{timeAgo}</span>
        </div>
      </div>

      {/* Recipe content */}
      <Link href={`/recipes/${recipe.id}`}>
        {recipe.image_url && (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg">{recipe.title}</h3>
          {recipe.description && (
            <p className="text-gray-500 text-sm mt-1 line-clamp-2">
              {recipe.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
            {recipe.prep_time_minutes && (
              <span>Prep: {recipe.prep_time_minutes}min</span>
            )}
            {recipe.cook_time_minutes && (
              <span>Cook: {recipe.cook_time_minutes}min</span>
            )}
            {recipe.servings && <span>Serves {recipe.servings}</span>}
          </div>
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}
