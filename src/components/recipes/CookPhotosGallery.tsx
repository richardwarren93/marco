"use client";

import { useState, useEffect, useCallback } from "react";
import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_MUTED, PAPER } from "@/lib/theme";

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
      <div className="overflow-hidden">
        {/* My Cooks */}
        {myPhotos.length > 0 && (
          <div className="py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>My cooks</h3>
              <span className="text-xs" style={{ color: INK_MUTED }}>
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
                  <div className="w-24 h-24 sm:w-28 sm:h-28 overflow-hidden" style={{ background: CREAM_WARM, borderRadius: 12, border: `2px solid ${INK}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image_url}
                      alt={photo.caption || "My cook"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <p className="text-[10px] mt-1 text-center" style={{ color: INK_MUTED }}>
                    {formatDate(photo.cooked_at)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Friends who made this */}
        {friendPhotos.length > 0 && (
          <div className="py-3" style={myPhotos.length > 0 ? { borderTop: `2px solid ${INK}` } : undefined}>
            <h3 className="text-sm mb-3" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>Friends who made this</h3>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {friendPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightbox(photo)}
                  className="flex-shrink-0 group relative"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 overflow-hidden relative" style={{ background: CREAM_WARM, borderRadius: 12, border: `2px solid ${INK}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image_url}
                      alt={photo.caption || "Friend's cook"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {/* Friend avatar overlay */}
                    {photo.profile && (
                      <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full overflow-hidden flex items-center justify-center" style={{ background: BUTTER, border: `2px solid ${INK}` }}>
                        {photo.profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.profile.avatar_url}
                            alt={photo.profile.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px]" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>
                            {photo.profile.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] mt-1 text-center truncate max-w-[6rem] sm:max-w-[7rem]" style={{ color: INK_MUTED }}>
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
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-lg w-full animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full flex items-center justify-center text-sm active:scale-90 transition-transform" style={{ background: PAPER, color: INK, border: `2px solid ${INK}` }}
            >
              ✕
            </button>
            <div className="overflow-hidden" style={{ background: INK, borderRadius: 16, border: `2.5px solid ${INK}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.image_url}
                alt={lightbox.caption || "Cook photo"}
                className="w-full max-h-[70vh] object-contain"
              />
              {(lightbox.caption || "profile" in lightbox) && (
                <div className="p-4" style={{ background: INK }}>
                  {"profile" in lightbox && lightbox.profile && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center" style={{ background: BUTTER }}>
                        {lightbox.profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={lightbox.profile.avatar_url}
                            alt={lightbox.profile.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px]" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>
                            {lightbox.profile.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-sm" style={{ color: PAPER, fontFamily: DISPLAY, fontWeight: 700 }}>
                        {lightbox.profile.display_name}
                      </span>
                    </div>
                  )}
                  {lightbox.caption && (
                    <p className="text-sm" style={{ color: PAPER, opacity: 0.85 }}>{lightbox.caption}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: PAPER, opacity: 0.6 }}>
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
