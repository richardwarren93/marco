"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RecipeCard from "@/components/recipes/RecipeCard";
import ShareCollectionModal from "@/components/collections/ShareCollectionModal";
import Link from "next/link";
import type { Collection, Recipe } from "@/types";

export default function CollectionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [removingRecipeId, setRemovingRecipeId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/collections/${id}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        setCollection(data.collection as Collection);
        setRecipes((data.recipes as Recipe[]) || []);
        setIsOwner(data.isOwner);
        setEditName(data.collection.name);
        setEditDescription(data.collection.description || "");
      } catch (error) {
        console.error("Fetch collection error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this collection? Recipes will not be deleted.")) return;
    setDeleting(true);

    const res = await fetch("/api/collections/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      router.push("/collections");
    } else {
      setDeleting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/collections/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editName,
        description: editDescription || null,
      }),
    });

    if (res.ok) {
      const { collection: updated } = await res.json();
      setCollection(updated as Collection);
      setEditing(false);
    }
  }

  async function handleRemoveRecipe(recipeId: string) {
    setRemovingRecipeId(recipeId);

    const res = await fetch("/api/collections/recipes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection_id: id, recipe_id: recipeId }),
    });

    if (res.ok) {
      setRecipes(recipes.filter((r) => r.id !== recipeId));
    }
    setRemovingRecipeId(null);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">Collection not found.</p>
        <Link href="/collections" className="text-orange-600 hover:underline mt-2 inline-block">
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/collections" className="text-gray-500 hover:text-gray-700 text-sm mb-4 inline-block">
        &larr; Back to collections
      </Link>

      {editing ? (
        <form onSubmit={handleUpdate} className="mb-6">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-lg px-3 py-1 w-full mb-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none mb-2"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
              {collection.description && (
                <p className="text-gray-600 mt-1">{collection.description}</p>
              )}
              <p className="text-sm text-gray-400 mt-2">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
                {collection.is_public && " \u00B7 Public"}
              </p>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowShare(true)}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  Share
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No recipes in this collection yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="relative">
              <RecipeCard recipe={recipe} />
              {isOwner && (
                <button
                  onClick={() => handleRemoveRecipe(recipe.id)}
                  disabled={removingRecipeId === recipe.id}
                  className="absolute top-2 right-2 bg-white/90 text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded-lg shadow"
                >
                  {removingRecipeId === recipe.id ? "..." : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {collection.is_public && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Share link:{" "}
            <span className="text-orange-600 font-mono text-xs">
              {typeof window !== "undefined"
                ? `${window.location.origin}/collections/shared/${collection.share_token}`
                : `/collections/shared/${collection.share_token}`}
            </span>
          </p>
        </div>
      )}

      {showShare && (
        <ShareCollectionModal
          collection={collection}
          isOpen={showShare}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
