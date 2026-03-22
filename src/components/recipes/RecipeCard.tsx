"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@/types";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [displayImage, setDisplayImage] = useState<string | null>(
    recipe.image_url
  );

  useEffect(() => {
    if (recipe.image_url) return;

    // Fetch most recent user-uploaded photo as fallback
    const supabase = createClient();
    supabase
      .from("recipe_photos")
      .select("photo_url")
      .eq("recipe_id", recipe.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDisplayImage(data[0].photo_url);
        }
      });
  }, [recipe.id, recipe.image_url]);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
    >
      {displayImage && (
        <div className="h-48 bg-gray-100">
          <img
            src={displayImage}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">
            {recipe.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          {recipe.prep_time_minutes && (
            <span>Prep: {recipe.prep_time_minutes}m</span>
          )}
          {recipe.cook_time_minutes && (
            <span>Cook: {recipe.cook_time_minutes}m</span>
          )}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          {recipe.source_platform && (
            <span className="capitalize">{recipe.source_platform}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
