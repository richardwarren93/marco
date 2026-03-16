"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Collection } from "@/types";

interface Props {
  recipeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToCollectionModal({ recipeId, isOpen, onClose }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
    }
  }, [isOpen]);

  async function fetchCollections() {
    setLoading(true);
    const { data } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false });
    setCollections((data as Collection[]) || []);
    setLoading(false);
  }

  async function handleAdd(collectionId: string) {
    setAddingId(collectionId);
    setError("");
    setSuccessId(null);

    try {
      const res = await fetch("/api/collections/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection_id: collectionId, recipe_id: recipeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add recipe");
      }

      setSuccessId(collectionId);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add recipe");
    } finally {
      setAddingId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create collection");
      }

      setNewName("");
      await fetchCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setCreating(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add to Collection</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-3">{error}</p>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading collections...</p>
        ) : collections.length === 0 ? (
          <p className="text-gray-500 text-sm mb-4">No collections yet. Create one below.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{collection.name}</p>
                  {collection.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">{collection.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleAdd(collection.id)}
                  disabled={addingId === collection.id}
                  className={`text-sm px-3 py-1 rounded-lg font-medium ${
                    successId === collection.id
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  } disabled:opacity-50`}
                >
                  {addingId === collection.id
                    ? "Adding..."
                    : successId === collection.id
                    ? "Added!"
                    : "Add"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500 mb-2">New Collection</p>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="Collection name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {creating ? "..." : "Create"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
