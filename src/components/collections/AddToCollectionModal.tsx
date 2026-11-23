"use client";

import { useEffect, useState } from "react";
import type { Collection } from "@/types";
import { CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LIME, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

interface Props {
  recipeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToCollectionModal({ recipeId, isOpen, onClose }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [alreadyInIds, setAlreadyInIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAddedIds(new Set());
      setError("");
      fetchCollections();
      fetchExistingMembership();
    }
  }, [isOpen, recipeId]);

  async function fetchCollections() {
    setLoading(true);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err) {
      console.error("Fetch collections error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExistingMembership() {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/collections`);
      if (!res.ok) return;
      const { collections: existing } = await res.json();
      setAlreadyInIds(new Set((existing || []).map((c: { id: string }) => c.id)));
    } catch {
      // ignore
    }
  }

  async function handleAdd(collectionId: string) {
    setAddingId(collectionId);
    setError("");

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

      setAddedIds((prev) => new Set(prev).add(collectionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add recipe");
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(collectionId: string) {
    setAddingId(collectionId);
    setError("");

    try {
      const res = await fetch("/api/collections/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection_id: collectionId, recipe_id: recipeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove recipe");
      }

      // Remove from both sets
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
      setAlreadyInIds((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove recipe");
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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md"
        style={{ background: PAPER, borderRadius: 20, border: `2.5px solid ${INK}`, boxShadow: `5px 6px 0 ${INK}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `2.5px solid ${INK}` }}>
          <h2 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>Add to collection</h2>
          <button onClick={onClose} aria-label="Close" className="p-1" style={{ color: INK_MUTED }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="px-5 py-2.5 text-[12.5px]" style={{ background: "rgba(229,70,46,0.12)", color: TOMATO_DARK, borderBottom: `2px solid ${INK}` }}>
            {error}
          </div>
        )}

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <p className="text-sm py-2" style={{ color: INK_SOFT }}>
              No collections yet. Make your first one below.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto overscroll-contain -mx-1 px-1">
              {collections.map((collection) => {
                const isInCollection = addedIds.has(collection.id) || alreadyInIds.has(collection.id);
                const isProcessing = addingId === collection.id;

                return (
                  <div key={collection.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="min-w-0">
                      <p className="truncate" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14 }}>
                        {collection.name}
                      </p>
                      {collection.description && (
                        <p className="text-xs line-clamp-1" style={{ color: INK_SOFT }}>{collection.description}</p>
                      )}
                    </div>
                    {/* One toggle, pressed in when the recipe is in the collection.
                        It used to be a button labelled "Added" that swapped to
                        "Remove" on hover — so on a phone, where nothing hovers,
                        the label never stopped saying "Added" and tapping it
                        silently removed the recipe. */}
                    <button
                      onClick={() => (isInCollection ? handleRemove(collection.id) : handleAdd(collection.id))}
                      disabled={isProcessing}
                      aria-pressed={isInCollection}
                      className="flex-shrink-0 flex items-center justify-center text-xs px-3 py-1.5 active:scale-95 transition-transform disabled:opacity-60"
                      style={{
                        background: isInCollection ? LIME : PAPER,
                        color: INK,
                        fontFamily: DISPLAY,
                        fontWeight: 700,
                        border: `2px solid ${INK}`,
                        borderRadius: 99,
                        boxShadow: isInCollection ? `1px 1px 0 ${INK}` : `2px 2px 0 ${INK}`,
                        transform: isInCollection ? "translate(1px, 1px)" : undefined,
                        minWidth: 62,
                        minHeight: 28,
                      }}
                    >
                      {isProcessing ? (
                        <div className="w-3 h-3 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
                      ) : isInCollection ? (
                        "Added"
                      ) : (
                        "Add"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4" style={{ borderTop: `2px solid ${INK}` }}>
          <p className="text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_MUTED, fontWeight: 700 }}>
            New collection
          </p>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Weeknight dinners"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-0 px-3.5 py-2.5 text-sm outline-none"
              style={{ background: CREAM_WARM, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
              onFocus={(e) => { e.currentTarget.style.background = PAPER; }}
              onBlur={(e) => { e.currentTarget.style.background = CREAM_WARM; }}
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex-shrink-0 flex items-center justify-center px-4 py-2.5 active:scale-95 transition-transform disabled:opacity-50"
              style={{
                background: TOMATO,
                color: PAPER,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 13.5,
                border: `2.5px solid ${INK}`,
                borderRadius: 10,
                boxShadow: `3px 3px 0 ${INK}`,
                minWidth: 76,
              }}
            >
              {creating ? (
                <div className="w-3.5 h-3.5 border-2 border-[var(--paper)] border-t-transparent rounded-full animate-spin" />
              ) : (
                "Create"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
