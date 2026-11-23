"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RecipeCard from "@/components/recipes/RecipeCard";
import KitchenSurface from "@/components/layout/KitchenSurface";
import type { Collection, Recipe } from "@/types";
import { DISPLAY, INK, INK_MUTED, INK_SOFT, PAPER } from "@/lib/theme";

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
      <KitchenSurface>
        <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
        </div>
      </KitchenSurface>
    );
  }

  if (error || !collection) {
    return (
      <KitchenSurface>
        <div className="max-w-lg mx-auto px-4 py-12">
          <div
            className="p-6 text-center"
            style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
          >
            <p style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>
              {error || "Collection not found."}
            </p>
            {/* The API's own message already says why ("not found or is no
                longer public"), so this line adds the way out rather than
                saying it a second time. */}
            <p className="mt-1.5 text-sm" style={{ color: INK_SOFT }}>
              Ask whoever sent it to share the collection again.
            </p>
          </div>
        </div>
      </KitchenSurface>
    );
  }

  return (
    <KitchenSurface>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: INK_MUTED, fontWeight: 700 }}>
            Shared collection
          </p>
          <h1 className="mt-1" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, lineHeight: 1.15 }}>
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-1.5 text-sm" style={{ color: INK_SOFT }}>{collection.description}</p>
          )}
          <p className="mt-2 text-sm" style={{ color: INK_MUTED }}>
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
          </p>
        </div>

        {recipes.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
          >
            <p className="text-sm" style={{ color: INK_SOFT }}>No recipes in this collection yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </KitchenSurface>
  );
}
