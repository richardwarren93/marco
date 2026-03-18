import Link from "next/link";
import type { Recipe } from "@/types";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
    >
      {recipe.image_url && (
        <div className="h-48 bg-gray-100">
          <img
            src={recipe.image_url}
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
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
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
        <div className="mt-3 text-xs text-gray-400">
          {recipe.source_platform && (
            <span className="capitalize">{recipe.source_platform}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
