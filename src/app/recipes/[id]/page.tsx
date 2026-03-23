"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Recipe, Ingredient } from "@/types";
import SocialEmbed from "@/components/recipes/SocialEmbed";
import RecipeForm from "@/components/recipes/RecipeForm";
import AddToCollectionModal from "@/components/collections/AddToCollectionModal";
import CommunitySection from "@/components/community/CommunitySection";
import ShareWithFriendsModal from "@/components/friends/ShareWithFriendsModal";
import IMadeThisButton from "@/components/gamification/IMadeThisButton";
import MyNotesCard from "@/components/recipes/MyNotesCard";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showShareWithFriends, setShowShareWithFriends] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchRecipe = useCallback(async () => {
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();
    setRecipe(data as Recipe | null);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  async function handleDelete() {
    if (!confirm("Delete this recipe?")) return;
    setDeleting(true);
    await supabase.from("recipes").delete().eq("id", id);
    router.push("/recipes");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">Recipe not found.</p>
        <Link href="/recipes" className="text-orange-600 hover:underline mt-2 inline-block">
          Back to recipes
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <RecipeForm
          recipe={recipe}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            fetchRecipe();
          }}
        />
      </div>
    );
  }

  const ingredients = recipe.ingredients as Ingredient[];
  const steps = recipe.steps as string[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="text-gray-500 hover:text-gray-700 text-sm mb-4 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="flex items-start justify-between mb-2 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{recipe.title}</h1>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <button
            onClick={() => setShowShareWithFriends(true)}
            className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            Share
          </button>
          <button
            onClick={() => setShowAddToCollection(true)}
            className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            + List
          </button>
          <button
            onClick={() => setEditing(true)}
            className="text-orange-600 hover:text-orange-700 text-xs sm:text-sm font-medium px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors touch-manipulation"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-600 text-xs sm:text-sm px-2 py-1 rounded-lg hover:bg-red-50 transition-colors touch-manipulation"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>

      {recipe.description && (
        <p className="text-gray-600 mb-3 text-sm sm:text-base">{recipe.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-5">
        {recipe.meal_type && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
            recipe.meal_type === "breakfast" ? "bg-yellow-50 text-yellow-700" :
            recipe.meal_type === "lunch" ? "bg-sky-50 text-sky-700" :
            recipe.meal_type === "dinner" ? "bg-indigo-50 text-indigo-700" :
            "bg-green-50 text-green-700"
          }`}>
            {{ breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" }[recipe.meal_type]} {recipe.meal_type}
          </span>
        )}
        {recipe.prep_time_minutes && <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">⏱ {recipe.prep_time_minutes}m prep</span>}
        {recipe.cook_time_minutes && <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">🔥 {recipe.cook_time_minutes}m cook</span>}
        {recipe.servings && <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">👤 {recipe.servings}</span>}
        {recipe.source_platform && (
          <a
            href={recipe.source_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-600 hover:underline capitalize bg-orange-50 px-2 py-1 rounded-full"
          >
            View on {recipe.source_platform}
          </a>
        )}
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="bg-orange-50 text-orange-700 text-sm px-3 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {recipe.notes && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{recipe.notes}</p>
        </div>
      )}

      {/* I Made This Button */}
      <div className="mb-6">
        <IMadeThisButton recipeId={recipe.id} />
      </div>

      {/* My Private Notes & Rating */}
      <div className="mb-6">
        <MyNotesCard recipeId={recipe.id} />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Ingredients
          </h2>
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                <span>
                  {ing.amount && <strong>{ing.amount} </strong>}
                  {ing.unit && <span>{ing.unit} </span>}
                  {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Steps</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-orange-600 font-bold flex-shrink-0">
                  {i + 1}.
                </span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {recipe.source_url && recipe.source_platform && recipe.source_platform !== "other" && (
        <SocialEmbed
          sourceUrl={recipe.source_url}
          sourcePlatform={recipe.source_platform}
        />
      )}

      {recipe.source_url && (
        <CommunitySection sourceUrl={recipe.source_url} />
      )}

      <AddToCollectionModal
        recipeId={recipe.id}
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
      />

      <ShareWithFriendsModal
        isOpen={showShareWithFriends}
        onClose={() => setShowShareWithFriends(false)}
        itemType="recipe"
        itemId={recipe.id}
        itemTitle={recipe.title}
      />
    </div>
  );
}
