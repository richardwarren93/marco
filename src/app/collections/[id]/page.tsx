"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Collection, Recipe } from "@/types";
import ShareCollectionModal from "@/components/collections/ShareCollectionModal";
import ShareWithFriendsModal from "@/components/friends/ShareWithFriendsModal";
import AddToCollectionModal from "@/components/collections/AddToCollectionModal";
import { MealTypeIcon } from "@/components/icons/MealIcons";
import KitchenSurface from "@/components/layout/KitchenSurface";
import { CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LAV, LIME, PAPER, PINK, TOMATO, TOMATO_DARK } from "@/lib/theme";

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
    const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="relative group">
      <Link
        href={`/recipes/${recipe.id}`}
        className="block overflow-hidden active:scale-[0.98] transition-transform"
        style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
      >
        {/* Image */}
        <div className="relative h-32 flex items-center justify-center overflow-hidden" style={{ background: CREAM_WARM, borderBottom: `2.5px solid ${INK}` }}>
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
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle at 35% 40%, var(--mustard, #E8A33D) 0%, transparent 45%), radial-gradient(circle at 70% 70%, var(--tomato, #E5462E) 0%, transparent 40%), var(--cream-warm, #EFE5D2)",
              }}
            >
              <MealTypeIcon type={recipe.meal_type} className="opacity-50" size={28} strokeWidth={1.6} />
            </div>
          )}
          {recipe.meal_type && (
            <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 capitalize" style={{ background: INK, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, borderRadius: 99 }}>
              {recipe.meal_type}
            </span>
          )}
          {recipe.source_platform && recipe.source_platform !== "other" && (
            <span
              className="absolute bottom-1.5 right-1.5 text-[10px] px-2 py-0.5"
              style={{
                background: recipe.source_platform === "instagram" ? PINK : recipe.source_platform === "youtube" ? TOMATO : INK,
                color: PAPER,
                fontFamily: DISPLAY,
                fontWeight: 700,
                border: `1.5px solid ${INK}`,
                borderRadius: 99,
              }}
            >
              {recipe.source_platform === "instagram"
                ? "IG"
                : recipe.source_platform === "youtube"
                  ? "YT"
                  : "TikTok"}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="line-clamp-2" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>
            {recipe.title}
          </h3>
          {lastMadeAt ? (
            <p className="text-[11px] mt-1.5" style={{ color: TOMATO, fontWeight: 600 }}>
              Made {timeAgo(lastMadeAt)}
            </p>
          ) : (
            <div className="flex items-center gap-2 mt-1.5">
              {totalTime > 0 && (
                <span className="text-[11px]" style={{ color: INK_SOFT }}>{totalTime} min</span>
              )}
              {recipe.servings && (
                <span className="text-[11px]" style={{ color: INK_SOFT }}>serves {recipe.servings}</span>
              )}
            </div>
          )}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5" style={{ background: LAV, color: INK, fontWeight: 700, border: `1.5px solid ${INK}`, borderRadius: 99 }}>
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
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: PAPER, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}
          aria-label="Remove from collection"
        >
          {removing ? (
            <div className="w-3 h-3 rounded-full animate-spin" style={{ border: `2px solid ${INK}`, borderTopColor: "transparent" }} />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={INK} strokeWidth={2.8}>
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
  const [isVirtual, setIsVirtual] = useState(false);
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
      setIsVirtual(data.isVirtual || false);
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
    if (res.ok) router.push("/recipes");
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
          <div className="h-4 w-32 skeleton-warm rounded-full" />
          <div className="h-8 w-64 skeleton-warm rounded-lg" />
          <div className="h-4 w-48 skeleton-warm rounded-full" />
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="overflow-hidden" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}` }}>
                <div className="h-32 skeleton-warm" />
                <div className="p-3 space-y-2">
                  <div className="h-3 skeleton-warm rounded-full w-3/4" />
                  <div className="h-2.5 skeleton-warm rounded-full w-1/2" />
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
        <p className="mb-3" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>Collection not found</p>
        <Link href="/recipes" className="inline-block px-4 py-2 text-sm active:scale-95 transition-transform" style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 99, boxShadow: `3px 3px 0 ${INK}` }}>
          Back to collections
        </Link>
      </div>
    );
  }

  // The virtual "Recently Added" collection isn't a real DB row, so hide all
  // collection-management actions (edit, delete, share, add/remove recipes).
  const canManage = isOwner && !isVirtual;

  return (
    <KitchenSurface>
      <div className="max-w-5xl mx-auto px-4 pt-4">
        {/* Back navigation */}
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1 text-sm mb-4"
          style={{ color: INK_SOFT, fontFamily: DISPLAY, fontWeight: 700 }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Collections
        </Link>

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        {editing ? (
          <form onSubmit={handleUpdate} className="mb-6 p-4" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="px-3 py-2 w-full mb-3 outline-none"
              style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10, fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 }}
              placeholder="Collection name"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full px-3 py-2 text-sm outline-none resize-none"
              style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
              rows={2}
            />
            <div className="flex gap-2 mt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 99, boxShadow: `3px 3px 0 ${INK}` }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditName(collection.name); setEditDescription(collection.description || ""); }}
                className="px-4 py-2 text-sm active:scale-95 transition-transform"
                style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 99, boxShadow: `3px 3px 0 ${INK}` }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-5">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 25, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: INK_SOFT }}>
                    {collection.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs" style={{ color: INK_MUTED }}>
                    {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
                  </span>
                  {collection.is_public && (
                    <>
                      <span style={{ color: INK_MUTED }}>·</span>
                      <span className="text-[10px] px-2 py-0.5" style={{ background: LIME, color: INK, fontWeight: 700, border: `1.5px solid ${INK}`, borderRadius: 99 }}>
                        Public
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions menu (owner only) */}
              {canManage && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                    style={{ background: PAPER, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}
                    aria-label="More actions"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={INK} strokeWidth={2.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                    </svg>
                  </button>

                  {showActions && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                      <div className="absolute right-0 top-full mt-1.5 z-20 py-1 min-w-[190px] overflow-hidden" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
                        <button
                          onClick={() => { setShowActions(false); setEditing(true); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm active:bg-black/5 transition-colors"
                          style={{ color: INK, fontWeight: 600 }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={INK_MUTED} strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit details
                        </button>
                        <button
                          onClick={() => { setShowActions(false); setShowShareWithFriends(true); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm active:bg-black/5 transition-colors"
                          style={{ color: INK, fontWeight: 600 }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={INK_MUTED} strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Send to friend
                        </button>
                        <button
                          onClick={() => { setShowActions(false); setShowShare(true); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm active:bg-black/5 transition-colors"
                          style={{ color: INK, fontWeight: 600 }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={INK_MUTED} strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Share link
                        </button>
                        <div className="my-1" style={{ borderTop: `1.5px solid ${INK}`, opacity: 0.25 }} />
                        <button
                          onClick={() => { setShowActions(false); handleDelete(); }}
                          disabled={deleting}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm active:bg-black/5 transition-colors"
                          style={{ color: TOMATO_DARK, fontWeight: 700 }}
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
            {canManage && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowAddRecipes(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm active:scale-95 transition-transform"
                  style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 99, boxShadow: `3px 3px 0 ${INK}` }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add recipes
                </button>
                <button
                  onClick={() => setShowShareWithFriends(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm active:scale-95 transition-transform"
                  style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 99, boxShadow: `3px 3px 0 ${INK}` }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={INK} strokeWidth={2}>
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
          <div className="text-center py-16 px-6" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <div className="text-4xl mb-3">📖</div>
            <p className="mb-1" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>No recipes yet</p>
            <p className="text-sm mb-4" style={{ color: INK_SOFT }}>Add recipes to start building this collection</p>
            {canManage && (
              <button
                onClick={() => setShowAddRecipes(true)}
                className="px-4 py-2 text-sm active:scale-95 transition-transform"
                style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2.5px solid ${INK}`, borderRadius: 99, boxShadow: `3px 3px 0 ${INK}` }}
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
                isOwner={canManage}
                removing={removingRecipeId === recipe.id}
                onRemove={() => handleRemoveRecipe(recipe.id)}
                lastMadeAt={isRecentlyMade ? (recipe as Recipe & { last_made_at?: string }).last_made_at : undefined}
              />
            ))}

            {/* Add more card */}
            {canManage && (
              <button
                onClick={() => setShowAddRecipes(true)}
                className="flex flex-col items-center justify-center h-32 active:scale-[0.98] transition-transform"
                style={{ background: PAPER, borderRadius: 16, border: `2.5px dashed ${INK}`, color: INK_SOFT }}
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
    </KitchenSurface>
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
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={hasAdded ? onAdded : onClose} />
      <div className="relative mt-auto max-h-[85vh] flex flex-col animate-slide-up" style={{ background: PAPER, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: `2.5px solid ${INK}`, borderLeft: `2.5px solid ${INK}`, borderRight: `2.5px solid ${INK}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2.5" style={{ borderBottom: `2.5px solid ${INK}` }}>
          <h2 style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>Add recipes</h2>
          <button
            onClick={hasAdded ? onAdded : onClose}
            className="px-3 py-1.5 text-[13px] active:scale-95 transition-transform"
            style={{ background: hasAdded ? TOMATO : PAPER, color: hasAdded ? PAPER : INK, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 99, boxShadow: `2px 2px 0 ${INK}` }}
          >
            {hasAdded ? "Done" : "Cancel"}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={INK_MUTED} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-9 pr-4 py-2.5 text-sm outline-none"
              style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
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
                  <div className="w-12 h-12 skeleton-warm rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 skeleton-warm rounded-full w-3/4" />
                    <div className="h-2.5 skeleton-warm rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: INK_SOFT }}>
              {search ? "No recipes match your search" : "No recipes found"}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((recipe) => {
                const alreadyIn = existingRecipeIds.includes(recipe.id) || addedIds.has(recipe.id);
                                return (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-3 py-2 px-1 rounded-lg active:bg-black/5 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {recipe.image_url ? (
                        <div className="relative w-full h-full"><Image src={recipe.image_url} alt="" fill className="object-cover" sizes="44px" /></div>
                      ) : (
                        <MealTypeIcon type={recipe.meal_type} className="opacity-55" size={20} strokeWidth={1.7} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>{recipe.title}</p>
                      {recipe.meal_type && (
                        <p className="text-[11px] capitalize" style={{ color: INK_SOFT }}>{recipe.meal_type}</p>
                      )}
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => handleAdd(recipe.id)}
                      disabled={alreadyIn || addingId === recipe.id}
                      className="flex-shrink-0 text-xs px-3 py-1.5 active:scale-95 transition-transform disabled:opacity-70"
                      style={{
                        background: alreadyIn ? LIME : PAPER,
                        color: INK,
                        fontFamily: DISPLAY,
                        fontWeight: 700,
                        border: `2px solid ${INK}`,
                        borderRadius: 99,
                        boxShadow: `2px 2px 0 ${INK}`,
                      }}
                    >
                      {addingId === recipe.id ? (
                        <div className="w-3 h-3 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
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
