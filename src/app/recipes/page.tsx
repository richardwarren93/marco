"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RecipeCard from "@/components/recipes/RecipeCard";
import Link from "next/link";
import type { Recipe } from "@/types";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alpha" | "cook_time">("newest");
  const supabase = createClient();

  useEffect(() => {
    async function fetchRecipes() {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });
      setRecipes((data as Recipe[]) || []);
      setLoading(false);
    }
    fetchRecipes();
  }, [supabase]);

  const filtered = recipes
    .filter(
      (r) =>
        r.title.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "alpha":
          return a.title.localeCompare(b.title);
        case "cook_time": {
          const aTime = a.cook_time_minutes ?? Infinity;
          const bTime = b.cook_time_minutes ?? Infinity;
          return aTime - bTime;
        }
        default:
          return 0;
      }
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Recipes</h1>
        <Link
          href="/recipes/new"
          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
        >
          + Save Recipe
        </Link>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search recipes or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="alpha">A-Z</option>
          <option value="cook_time">Cook Time</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading recipes...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {search
              ? "No recipes match your search."
              : "No recipes saved yet."}
          </p>
          {!search && (
            <Link
              href="/recipes/new"
              className="text-orange-600 hover:underline font-medium"
            >
              Save your first recipe
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
