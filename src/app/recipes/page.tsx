"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RecipeCard from "@/components/recipes/RecipeCard";
import TagFilter from "@/components/recipes/TagFilter";
import Link from "next/link";
import type { Recipe } from "@/types";
import { RecipesIcon, SearchIcon } from "@/components/icons/HandDrawnIcons";

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "alpha", label: "A–Z" },
  { value: "cook_time", label: "⏱️ Cook Time" },
] as const;

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  const allTags = [...new Set(recipes.flatMap((r) => r.tags))].sort();

  function handleToggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const filtered = recipes
    .filter(
      (r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .filter(
      (r) =>
        selectedTags.length === 0 ||
        selectedTags.every((tag) => r.tags.includes(tag))
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
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RecipesIcon className="w-7 h-7 text-orange-600" /> My Recipes
          </h1>
        <Link
          href="/recipes/new"
          className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
        >
          + Save Recipe
        </Link>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon className="w-4 h-4" /></span>
          <input
            type="text"
            placeholder="Search recipes or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-full shadow-sm border-0 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                sortBy === opt.value
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="mb-6">
          <TagFilter
            tags={allTags}
            selected={selectedTags}
            onToggle={handleToggleTag}
            onClear={() => setSelectedTags([])}
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-36 bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded-full animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <div className="text-gray-300 flex justify-center mb-3">
            {search || selectedTags.length > 0
              ? <SearchIcon className="w-12 h-12" />
              : <RecipesIcon className="w-12 h-12" />}
          </div>
          <p className="text-gray-500 mb-3">
            {search || selectedTags.length > 0
              ? "No recipes match your search"
              : "No recipes saved yet"}
          </p>
          {!search && selectedTags.length === 0 && (
            <Link
              href="/recipes/new"
              className="text-orange-600 hover:text-orange-700 font-medium text-sm"
            >
              Save your first recipe →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
