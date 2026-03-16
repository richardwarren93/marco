"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RecipeCard from "@/components/recipes/RecipeCard";
import type { Collection, Recipe } from "@/types";

export default function SharedCollectionPage() {
  const { token } = useParams();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSharedCollection() {
      try {
        const res = await fetch(`/api/collections/shared/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Collection not found.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setCollection(data.collection as Collection);
        setRecipes((data.recipes as Recipe[]) || []);
      } catch (err) {
        console.error("Fetch shared collection error:", err);
        setError("Failed to load collection.");
      } finally {
        setLoading(false);
      }
    }
    fetchSharedCollection();
  }, [token]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">{error || "Collection not found."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-sm text-orange-600 font-medium mb-1">Shared Collection</p>
        <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
        {collection.description && (
          <p className="text-gray-600 mt-1">{collection.description}</p>
        )}
        <p className="text-sm text-gray-400 mt-2">
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
        </p>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No recipes in this collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
