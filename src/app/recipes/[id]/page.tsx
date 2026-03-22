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
import PhotoGallery from "@/components/recipes/PhotoGallery";
import PhotoUpload from "@/components/recipes/PhotoUpload";
import ShareButton from "@/components/social/ShareButton";
import InlineTagEditor from "@/components/recipes/InlineTagEditor";
import ServingScaler from "@/components/recipes/ServingScaler";
import UnitToggle from "@/components/recipes/UnitToggle";
import { convertIngredient } from "@/lib/units";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const [unitSystem, setUnitSystem] = useState<"us" | "metric">("us");
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchRecipe = useCallback(async () => {
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();
    const r = data as Recipe | null;
    setRecipe(r);

    // If no scraped image, use most recent user-uploaded photo
    if (r && !r.image_url) {
      const { data: photos } = await supabase
        .from("recipe_photos")
        .select("photo_url")
        .eq("recipe_id", r.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (photos && photos.length > 0) {
        setHeroImage(photos[0].photo_url);
      }
    } else if (r) {
      setHeroImage(r.image_url);
    }

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    fetchRecipe();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id);
    });
  }, [fetchRecipe, supabase.auth]);

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

      {heroImage && (
        <div className="rounded-xl overflow-hidden mb-6">
          <img
            src={heroImage}
            alt={recipe.title}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
        <div className="flex items-center gap-3">
          {currentUserId === recipe.user_id && (
            <ShareButton recipeId={recipe.id} />
          )}
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

      {currentUserId === recipe.user_id ? (
        <div className="mb-6">
          <InlineTagEditor
            recipeId={recipe.id}
            tags={recipe.tags}
            onTagsUpdated={(newTags) =>
              setRecipe((prev) => (prev ? { ...prev, tags: newTags } : prev))
            }
          />
        </div>
      ) : recipe.tags.length > 0 ? (
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
      ) : null}

      {recipe.notes && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{recipe.notes}</p>
        </div>
      )}

      {/* Unit Toggle + Serving Scaler */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <UnitToggle system={unitSystem} onChange={setUnitSystem} />
        <div className="flex-1 max-w-xs">
          <ServingScaler
            originalServings={recipe.servings || 2}
            multiplier={servingMultiplier}
            onChange={setServingMultiplier}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Ingredients
          </h2>
          <ul className="space-y-2">
            {ingredients.map((ing, i) => {
              const converted = convertIngredient(ing, unitSystem, servingMultiplier);
              return (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                  <span>
                    {converted.amount && <strong>{converted.amount} </strong>}
                    {converted.unit && <span>{converted.unit} </span>}
                    {converted.name}
                  </span>
                </li>
              );
            })}
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

      {/* Photos Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Photos</h2>
        <PhotoGallery
          recipeId={recipe.id}
          currentUserId={currentUserId}
          refreshKey={photoRefreshKey}
        />
        {currentUserId === recipe.user_id && (
          <div className="mt-3">
            <PhotoUpload
              recipeId={recipe.id}
              onUploaded={() => {
                setPhotoRefreshKey((k) => k + 1);
                // Update hero image if none exists
                if (!recipe.image_url) {
                  supabase
                    .from("recipe_photos")
                    .select("photo_url")
                    .eq("recipe_id", recipe.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .then(({ data }) => {
                      if (data && data.length > 0) setHeroImage(data[0].photo_url);
                    });
                }
              }}
            />
          </div>
        )}
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
