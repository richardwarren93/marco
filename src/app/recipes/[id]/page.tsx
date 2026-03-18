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

export default function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
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
      <Link href="/recipes" className="text-gray-500 hover:text-gray-700 text-sm mb-4 inline-block">
        &larr; Back to recipes
      </Link>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddToCollection(true)}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            + Collection
          </button>
          <button
            onClick={() => setEditing(true)}
            className="text-orange-600 hover:text-orange-700 text-sm"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {recipe.description && (
        <p className="text-gray-600 mb-4">{recipe.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
        {recipe.prep_time_minutes && <span>Prep: {recipe.prep_time_minutes} min</span>}
        {recipe.cook_time_minutes && <span>Cook: {recipe.cook_time_minutes} min</span>}
        {recipe.servings && <span>Serves {recipe.servings}</span>}
        {recipe.source_platform && (
          <a
            href={recipe.source_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:underline capitalize"
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
    </div>
  );
}
