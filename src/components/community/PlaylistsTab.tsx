"use client";

import { useState, useEffect, useCallback } from "react";

interface Playlist {
  id: string;
  user_id: string;
  name: string;
  spotify_url: string;
  description: string | null;
  upvotes: number;
  created_at: string;
  profile: {
    display_name: string;
    avatar_url: string | null;
  } | null;
  userVoted: boolean;
}

/** Extract Spotify embed URL from various Spotify link formats */
function getSpotifyEmbedUrl(url: string): string | null {
  // Handle open.spotify.com/playlist/ID
  const match = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (match) {
    return `https://open.spotify.com/embed/playlist/${match[1]}?utm_source=generator&theme=0`;
  }
  // Handle spotify:playlist:ID
  const uriMatch = url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return `https://open.spotify.com/embed/playlist/${uriMatch[1]}?utm_source=generator&theme=0`;
  }
  return null;
}

export default function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"popular" | "newest">("popular");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/playlists?sort=${sort}`);
      if (!res.ok) return;
      const data = await res.json();
      setPlaylists(data.playlists || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  async function handleVote(playlistId: string) {
    // Optimistic update
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              userVoted: !p.userVoted,
              upvotes: p.userVoted ? p.upvotes - 1 : p.upvotes + 1,
            }
          : p
      )
    );

    try {
      const res = await fetch("/api/community/playlists/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist_id: playlistId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Sync with server
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId
            ? { ...p, userVoted: data.voted, upvotes: data.upvotes }
            : p
        )
      );
    } catch {
      // Revert on error
      fetchPlaylists();
    }
  }

  async function handleSubmit() {
    if (!newName.trim() || !newUrl.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/community/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          spotify_url: newUrl,
          description: newDesc || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to add playlist");
        return;
      }

      setNewName("");
      setNewUrl("");
      setNewDesc("");
      setShowAdd(false);
      fetchPlaylists();
    } catch {
      alert("Failed to add playlist");
    } finally {
      setSubmitting(false);
    }
  }

  function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div>
      {/* Header + Sort */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Dinner party playlists from the community
        </p>
        <div className="flex items-center bg-gray-100 rounded-full p-0.5">
          <button
            onClick={() => setSort("popular")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              sort === "popular"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSort("newest")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              sort === "newest"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            New
          </button>
        </div>
      </div>

      {/* Playlist list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-24" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎵</div>
          <p className="text-gray-500 text-sm mb-1">No playlists yet</p>
          <p className="text-gray-400 text-xs">Be the first to share a dinner party playlist!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((playlist) => {
            const embedUrl = getSpotifyEmbedUrl(playlist.spotify_url);
            const isExpanded = expandedId === playlist.id;

            return (
              <div
                key={playlist.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Upvote */}
                    <button
                      onClick={() => handleVote(playlist.id)}
                      className={`flex flex-col items-center gap-0.5 pt-0.5 transition-colors ${
                        playlist.userVoted
                          ? "text-orange-500"
                          : "text-gray-400 hover:text-orange-500"
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill={playlist.userVoted ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                      <span className="text-xs font-bold tabular-nums">{playlist.upvotes}</span>
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                        {playlist.name}
                      </h3>
                      {playlist.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {playlist.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {playlist.profile && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center">
                              {playlist.profile.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={playlist.profile.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[8px] font-bold text-orange-600">
                                  {playlist.profile.display_name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400">
                              {playlist.profile.display_name}
                            </span>
                          </div>
                        )}
                        <span className="text-[11px] text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">{timeAgo(playlist.created_at)}</span>
                      </div>
                    </div>

                    {/* Spotify / expand button */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : playlist.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isExpanded
                          ? "bg-green-100 text-green-700"
                          : "bg-green-50 text-green-600 hover:bg-green-100"
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                      {isExpanded ? "Hide" : "Listen"}
                    </button>
                  </div>
                </div>

                {/* Spotify embed — expanded */}
                {isExpanded && embedUrl && (
                  <div className="px-4 pb-4 animate-slide-up">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-xl"
                    />
                    <a
                      href={playlist.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-xs text-green-600 hover:text-green-700 font-medium mt-2"
                    >
                      Open in Spotify →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Add button */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-12 h-12 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center z-30"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Add Playlist Sheet */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 overflow-y-auto" onClick={() => setShowAdd(false)}>
          <div
            className="w-full max-w-lg bg-white rounded-2xl p-5 animate-slide-up my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add a Playlist</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Playlist Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sunday Italian Dinner"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Spotify Link</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description <span className="text-gray-400">(optional)</span></label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What's the vibe?"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !newName.trim() || !newUrl.trim()}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                {submitting ? "Adding..." : "Add Playlist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
