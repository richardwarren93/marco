import Link from "next/link";
import type { Recipe } from "@/types";

const tagColors = [
  "bg-orange-50 text-orange-700",
  "bg-pink-50 text-pink-700",
  "bg-purple-50 text-purple-700",
  "bg-teal-50 text-teal-700",
  "bg-sky-50 text-sky-700",
  "bg-lime-50 text-lime-700",
];

const platformStyles: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  tiktok: "bg-gray-900",
  other: "bg-gray-500",
};

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {recipe.image_url ? (
        <div className="h-44 bg-gray-100 relative">
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
          {recipe.source_platform && recipe.source_platform !== "other" && (
            <span className={`absolute top-2.5 left-2.5 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full ${platformStyles[recipe.source_platform]}`}>
              {recipe.source_platform === "instagram" ? "IG" : "TikTok"}
            </span>
          )}
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center relative">
          <span className="text-3xl">🍳</span>
          {recipe.source_platform && recipe.source_platform !== "other" && (
            <span className={`absolute top-2.5 left-2.5 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full ${platformStyles[recipe.source_platform]}`}>
              {recipe.source_platform === "instagram" ? "IG" : "TikTok"}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{recipe.description}</p>
        )}
        <div className="flex items-center gap-2.5 mt-3 text-xs text-gray-500">
          {recipe.prep_time_minutes && (
            <span className="flex items-center gap-1">⏱️ {recipe.prep_time_minutes}m prep</span>
          )}
          {recipe.cook_time_minutes && (
            <span className="flex items-center gap-1">🔥 {recipe.cook_time_minutes}m cook</span>
          )}
          {recipe.servings && <span>👤 {recipe.servings}</span>}
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {recipe.tags.slice(0, 3).map((tag, i) => (
              <span key={tag} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tagColors[i % tagColors.length]}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
