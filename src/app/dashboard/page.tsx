"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RecipeCard from "@/components/recipes/RecipeCard";
import Link from "next/link";
import type { Recipe, PantryItem } from "@/types";

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantryCount, setPantryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [recipesRes, pantryRes] = await Promise.all([
        supabase
          .from("recipes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("pantry_items")
          .select("id", { count: "exact", head: true }),
      ]);
      setRecipes((recipesRes.data as Recipe[]) || []);
      setPantryCount(pantryRes.count || 0);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/recipes/new"
          className="bg-orange-600 text-white rounded-xl p-5 hover:bg-orange-700 transition-colors"
        >
          <h3 className="font-semibold text-lg">Save a Recipe</h3>
          <p className="text-orange-100 text-sm mt-1">
            Paste an Instagram or TikTok link
          </p>
        </Link>
        <Link
          href="/pantry"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 text-lg">My Pantry</h3>
          <p className="text-gray-500 text-sm mt-1">
            {pantryCount} ingredient{pantryCount !== 1 ? "s" : ""} tracked
          </p>
        </Link>
        <Link
          href="/meal-plan"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 text-lg">Meal Plan</h3>
          <p className="text-gray-500 text-sm mt-1">
            Get AI-powered meal suggestions
          </p>
        </Link>
      </div>

      {/* Recent Recipes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Recipes
          </h2>
          {recipes.length > 0 && (
            <Link
              href="/recipes"
              className="text-orange-600 hover:underline text-sm font-medium"
            >
              View all
            </Link>
          )}
        </div>
        {recipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 mb-3">No recipes saved yet</p>
            <Link
              href="/recipes/new"
              className="text-orange-600 hover:underline font-medium"
            >
              Save your first recipe
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
