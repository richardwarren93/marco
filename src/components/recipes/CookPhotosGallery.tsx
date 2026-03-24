"use client";

import { useState, useEffect, useCallback } from "react";

interface CookPhoto {
  id: string;
  image_url: string;
  caption: string | null;
  cooked_at: string;
}

interface FriendCookPhoto extends CookPhoto {
  profile: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface CookPhotosGalleryProps {
  recipeId: string;
  refreshKey?: number;
}

export default function CookPhotosGallery({ recipeId, refreshKey }: CookPhotosGalleryProps) {
  const [myPhotos, setMyPhotos] = useState<CookPhoto[]>([]);
  const [friendPhotos, setFriendPhotos] = useState<FriendCookPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<(CookPhoto | FriendCookPhoto) | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/cooking-log/photos?recipe_id=${recipeId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMyPhotos(data.myPhotos || []);
      setFriendPhotos(data.friendPhotos || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos, refreshKey]);

  const hasPhotos = myPhotos.length > 0 || friendPhotos.length > 0;

  if (loading || !hasPhotos) return null;

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* My Cooks */}
        {myPhotos.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">My Cooks</h3>
              <span className="text-xs text-gray-400">
                {myPhotos.length} {myPhotos.length === 1 ? "time" : "times"}
              </span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {myPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightbox(photo)}
                  className="flex-shrink-0 group relative"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image_url}
                      alt={photo.caption || "My cook"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 text-center">
                    {formatDate(photo.cooked_at)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Friends who made this */}
        {friendPhotos.length > 0 && (
          <div className={`p-4 ${myPhotos.length > 0 ? "border-t border-gray-100" : ""}`}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Friends who made this</h3>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {friendPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightbox(photo)}
                  className="flex-shrink-0 group relative"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image_url}
                      alt={photo.caption || "Friend's cook"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {/* Friend avatar overlay */}
                    {photo.profile && (
                      <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-orange-100 flex items-center justify-center shadow-sm">
                        {photo.profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.profile.avatar_url}
                            alt={photo.profile.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-orange-600">
                            {photo.profile.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 text-center truncate max-w-[6rem] sm:max-w-[7rem]">
                    {photo.profile?.display_name || "Friend"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-lg w-full animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
            <div className="rounded-2xl overflow-hidden bg-gray-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.image_url}
                alt={lightbox.caption || "Cook photo"}
                className="w-full max-h-[70vh] object-contain"
              />
              {(lightbox.caption || "profile" in lightbox) && (
                <div className="p-4 bg-gray-900/90">
                  {"profile" in lightbox && lightbox.profile && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center">
                        {lightbox.profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={lightbox.profile.avatar_url}
                            alt={lightbox.profile.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-orange-600">
                            {lightbox.profile.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {lightbox.profile.display_name}
                      </span>
                    </div>
                  )}
                  {lightbox.caption && (
                    <p className="text-sm text-gray-300">{lightbox.caption}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(lightbox.cooked_at)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
