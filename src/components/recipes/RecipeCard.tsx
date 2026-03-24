"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@/types";
import AddToCollectionModal from "@/components/collections/AddToCollectionModal";
import QuickAddToPlanModal from "@/components/meal-plan/QuickAddToPlanModal";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [displayImage, setDisplayImage] = useState<string | null>(
    recipe.image_url
  );
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultName, setModalDefaultName] = useState<string | undefined>();
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    if (recipe.image_url) return;

    // Fetch most recent user-uploaded photo as fallback
    const supabase = createClient();
    supabase
      .from("recipe_photos")
      .select("photo_url")
      .eq("recipe_id", recipe.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDisplayImage(data[0].photo_url);
        }
      });
  }, [recipe.id, recipe.image_url]);

  function handleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setModalDefaultName("Favorites");
    setShowModal(true);
  }

  return (
    <>
      <div
        onClick={() => router.push(`/recipes/${recipe.id}`)}
        className="block bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
      >
        {displayImage && (
          <div className="h-48 bg-gray-100 relative">
            <img
              src={displayImage}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            {/* Overlay icons */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <button
                onClick={handleBookmark}
                className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm text-gray-700"
                title="Save to Favorites"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPlanModal(true);
                }}
                className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm text-gray-700"
                title="Add to Meal Plan"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg">{recipe.title}</h3>
          {recipe.description && (
            <p className="text-gray-500 text-sm mt-1 line-clamp-2">
              {recipe.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            {recipe.prep_time_minutes && (
              <span>Prep: {recipe.prep_time_minutes}m</span>
            )}
            {recipe.cook_time_minutes && (
              <span>Cook: {recipe.cook_time_minutes}m</span>
            )}
            {recipe.servings && <span>Serves {recipe.servings}</span>}
          </div>
          <div className="mt-3 text-xs text-gray-400">
            {recipe.source_platform && (
              <span className="capitalize">{recipe.source_platform}</span>
            )}
          </div>
        </div>
      </div>

      <AddToCollectionModal
        recipeId={recipe.id}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultName={modalDefaultName}
      />

      <QuickAddToPlanModal
        recipe={recipe}
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
      />
    </>
  );
}
