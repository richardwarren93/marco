"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Collection, Recipe } from "@/types";
import ShareCollectionModal from "@/components/collections/ShareCollectionModal";
import ShareWithFriendsModal from "@/components/friends/ShareWithFriendsModal";
import AddToCollectionModal from "@/components/collections/AddToCollectionModal";

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: "🥞",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

// ─── Mini recipe card for collection view ────────────────────────────────────
function CollectionRecipeCard({
  recipe,
  isOwner,
  removing,
  onRemove,
  lastMadeAt,
}: {
  recipe: Recipe;
  isOwner: boolean;
  removing: boolean;
  onRemove: () => void;
  lastMadeAt?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const emoji = MEAL_EMOJIS[recipe.meal_type ?? "dinner"] ?? "🍳";
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="relative group">
      <Link
        href={`/recipes/${recipe.id}`}
        className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
      >
        {/* Image */}
        <div className="relative h-32 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden">
          {recipe.image_url && !imgError ? (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-3xl">{emoji}</span>
          )}
          {recipe.meal_type && (
            <span className="absolute top-2 left-2 text-[10px] bg-black/40 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full font-medium capitalize">
              {recipe.meal_type}
            </span>
          )}
          {recipe.source_platform && recipe.source_platform !== "other" && (
            <span className={`absolute top-2 right-2 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              recipe.source_platform === "instagram"
                ? "bg-gradient-to-r from-purple-500 to-pink-500"
                : "bg-gray-900"
            }`}>
              {recipe.source_platform === "instagram" ? "IG" : "TikTok"}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {recipe.title}
          </h3>
          {lastMadeAt ? (
            <p className="text-[11px] text-orange-500 font-medium mt-1.5">
              Made {timeAgo(lastMadeAt)}
            </p>
          ) : (
            <div className="flex items-center gap-2 mt-1.5">
              {totalTime > 0 && (
                <span className="text-[11px] text-gray-400">{totalTime} min</span>
              )}
              {recipe.servings && (
                <span className="text-[11px] text-gray-400">serves {recipe.servings}</span>
              )}
            </div>
          )}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Remove button — shows on hover (desktop) or always visible (mobile) */}
      {isOwner && (
        <button
          onClick={(e) => { e.preventDefault(); onRemove(); }}
          disabled={removing}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow opacity-0 group-hover:opacity-100 sm:opacity-0 active:opacity-100 transition-opacity"
          aria-label="Remove from collection"
        >
          {removing ? (
            <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CollectionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingRecipeId, setRemovingRecipeId] = useState<string | null>(null);
  const [isRecentlyMade, setIsRecentlyMade] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Modals
  const [showShare, setShowShare] = useState(false);
  const [showShareWithFriends, setShowShareWithFriends] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Add recipes
  const [showAddRecipes, setShowAddRecipes] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/collections/${id}`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setCollection(data.collection as Collection);
      setRecipes((data.recipes as Recipe[]) || []);
      setIsOwner(data.isOwner);
      setIsRecentlyMade(data.isRecentlyMade || false);
      setEditName(data.collection.name);
      setEditDescription(data.collection.description || "");
    } catch (error) {
      console.error("Fetch collection error:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete() {
    if (!confirm("Delete this collection? Recipes will not be deleted.")) return;
    setDeleting(true);
    const res = await fetch("/api/collections/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) router.push("/recipes?tab=collections");
    else setDeleting(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/collections/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName, description: editDescription || null }),
    });
    if (res.ok) {
      const { collection: updated } = await res.json();
      setCollection(updated as Collection);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleRemoveRecipe(recipeId: string) {
    setRemovingRecipeId(recipeId);
    const res = await fetch("/api/collections/recipes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection_id: id, recipe_id: recipeId }),
    });
    if (res.ok) setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setRemovingRecipeId(null);
  }

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-gray-200 rounded-full" />
          <div className="h-8 w-64 bg-gray-200 rounded-lg" />
          <div className="h-4 w-48 bg-gray-100 rounded-full" />
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="h-32 bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Not found ─────────────────────────────────────────────────────────────
  if (!collection) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-8 text-center">
        <div className="text-4xl mb-3">📚</div>
        <p className="text-gray-500 mb-3">Collection not found</p>
        <Link href="/recipes?tab=collections" className="text-orange-600 hover:text-orange-700 text-sm font-medium">
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-28">
        {/* Back navigation */}
        <Link
          href="/recipes?tab=collections"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Collections
        </Link>

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        {editing ? (
          <form onSubmit={handleUpdate} className="mb-6 bg-white rounded-2xl p-4 shadow-sm">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-xl font-bold text-gray-900 border border-gray-200 rounded-xl px-3 py-2 w-full mb-3 focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all"
              placeholder="Collection name"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all resize-none"
              rows={2}
            />
            <div className="flex gap-2 mt-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-orange-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditName(collection.name); setEditDescription(collection.description || ""); }}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-5">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                    {collection.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">
                    {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
                  </span>
                  {collection.is_public && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
                        Public
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions menu (owner only) */}
              {isOwner && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    aria-label="More actions"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                    </svg>
                  </button>

                  {showActions && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 min-w-[180px] overflow-hidden">
                        <button
                          onClick={() => { setShowActions(false); setEditing(true); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit details
                        </button>
                        <button
                          onClick={() => { setShowActions(false); setShowShareWithFriends(true); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Send to friend
                        </button>
                        <button
                          onClick={() => { setShowActions(false); setShowShare(true); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Share link
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => { setShowActions(false); handleDelete(); }}
                          disabled={deleting}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deleting ? "Deleting..." : "Delete collection"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons row */}
            {isOwner && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowAddRecipes(true)}
                  className="flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add recipes
                </button>
                <button
                  onClick={() => setShowShareWithFriends(true)}
                  className="flex items-center gap-1.5 bg-white text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Recipe grid ────────────────────────────────────────────────── */}
        {recipes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-gray-500 mb-1">No recipes yet</p>
            <p className="text-gray-400 text-sm mb-4">Add recipes to start building this collection</p>
            {isOwner && (
              <button
                onClick={() => setShowAddRecipes(true)}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                Browse recipes to add
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recipes.map((recipe) => (
              <CollectionRecipeCard
                key={recipe.id}
                recipe={recipe}
                isOwner={isOwner}
                removing={removingRecipeId === recipe.id}
                onRemove={() => handleRemoveRecipe(recipe.id)}
                lastMadeAt={isRecentlyMade ? (recipe as Recipe & { last_made_at?: string }).last_made_at : undefined}
              />
            ))}

            {/* Add more card */}
            {isOwner && (
              <button
                onClick={() => setShowAddRecipes(true)}
                className="flex flex-col items-center justify-center h-32 bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all text-gray-400 hover:text-orange-500"
              >
                <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium">Add recipe</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────── */}
      {showShare && (
        <ShareCollectionModal
          collection={collection}
          isOpen={showShare}
          onClose={() => setShowShare(false)}
        />
      )}

      <ShareWithFriendsModal
        isOpen={showShareWithFriends}
        onClose={() => setShowShareWithFriends(false)}
        itemType="collection"
        itemId={collection.id}
        itemTitle={collection.name}
      />

      {/* Reuse AddToCollectionModal with a dummy recipeId — we actually need a recipe picker here */}
      {showAddRecipes && (
        <AddRecipesSheet
          collectionId={collection.id}
          existingRecipeIds={recipes.map((r) => r.id)}
          onClose={() => setShowAddRecipes(false)}
          onAdded={() => { fetchData(); setShowAddRecipes(false); }}
        />
      )}
    </>
  );
}

// ─── Add Recipes Sheet ───────────────────────────────────────────────────────
function AddRecipesSheet({
  collectionId,
  existingRecipeIds,
  onClose,
  onAdded,
}: {
  collectionId: string;
  existingRecipeIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const supabase = (async () => {
    const { createClient } = await import("@/lib/supabase/client");
    return createClient();
  })();

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      const { data } = await sb.from("recipes").select("*").order("created_at", { ascending: false });
      setRecipes((data as Recipe[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = recipes.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.tags?.some((t) => t.toLowerCase().includes(q));
  });

  async function handleAdd(recipeId: string) {
    setAddingId(recipeId);
    try {
      const res = await fetch("/api/collections/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection_id: collectionId, recipe_id: recipeId }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set(prev).add(recipeId));
      }
    } finally {
      setAddingId(null);
    }
  }

  const hasAdded = addedIds.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={hasAdded ? onAdded : onClose} />
      <div className="relative mt-auto bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Recipes</h2>
          <button
            onClick={hasAdded ? onAdded : onClose}
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            {hasAdded ? "Done" : "Cancel"}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:bg-gray-50 focus:ring-2 focus:ring-orange-200 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              {search ? "No recipes match your search" : "No recipes found"}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((recipe) => {
                const alreadyIn = existingRecipeIds.includes(recipe.id) || addedIds.has(recipe.id);
                const emoji = MEAL_EMOJIS[recipe.meal_type ?? "dinner"] ?? "🍳";

                return (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {recipe.image_url ? (
                        <div className="relative w-full h-full"><Image src={recipe.image_url} alt="" fill className="object-cover" sizes="44px" /></div>
                      ) : (
                        <span className="text-lg">{emoji}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{recipe.title}</p>
                      {recipe.meal_type && (
                        <p className="text-[11px] text-gray-400 capitalize">{recipe.meal_type}</p>
                      )}
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => handleAdd(recipe.id)}
                      disabled={alreadyIn || addingId === recipe.id}
                      className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                        alreadyIn
                          ? "bg-green-50 text-green-600"
                          : "bg-orange-100 text-orange-700 hover:bg-orange-200 active:scale-95"
                      } disabled:opacity-70`}
                    >
                      {addingId === recipe.id ? (
                        <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                      ) : alreadyIn ? (
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
      </div>
    </div>
  );
}
