"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecipePhoto } from "@/types";

interface PhotoGalleryProps {
  recipeId: string;
  currentUserId?: string;
  refreshKey?: number;
}

export default function PhotoGallery({
  recipeId,
  currentUserId,
  refreshKey,
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [lightbox, setLightbox] = useState<RecipePhoto | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const supabase = createClient();

  const fetchPhotos = useCallback(async () => {
    const { data } = await supabase
      .from("recipe_photos")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: false });
    setPhotos((data as RecipePhoto[]) || []);
  }, [recipeId, supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos, refreshKey]);

  async function handleDelete(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    setDeleting(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (lightbox?.id === photoId) setLightbox(null);
      }
    } finally {
      setDeleting(null);
    }
  }

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.photo_url}
              alt={photo.caption || "Recipe photo"}
              className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightbox(photo)}
            />
            {photo.caption && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {photo.caption}
              </p>
            )}
            {currentUserId === photo.user_id && (
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deleting === photo.id}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-3xl max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.photo_url}
              alt={lightbox.caption || "Recipe photo"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {lightbox.caption && (
              <p className="text-white text-center mt-2">{lightbox.caption}</p>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-900 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold hover:bg-gray-100"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
