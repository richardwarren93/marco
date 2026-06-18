"use client";

// Instagram-style share sheet. Slides up from the bottom with:
//   1. a row/grid of friend avatars you tap to send in-app (clear "Sent ✓"
//      feedback on each avatar), and
//   2. a row of external targets — Copy link, Share to… (native share sheet),
//      Messages, WhatsApp — so a recipe can leave the app and go anywhere.
//
// Keeps the original props (itemType/itemId/itemTitle) so the recipe-detail and
// collection call sites need no changes. The shareable URL is the public recipe
// page (any logged-in non-owner gets a sanitized "Save to my library" view).

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Friendship } from "@/types";
import { useToast } from "@/components/ui/Toast";

interface ShareWithFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: "recipe" | "collection";
  itemId: string;
  itemTitle: string;
}

const TOMATO = "#E5462E";
const INK = "#1C1A17";

export default function ShareWithFriendsModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemTitle,
}: ShareWithFriendsModalProps) {
  const { showToast } = useToast();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSent(new Set());
    setMessage("");
    setSearch("");
    setCopied(false);
    fetch("/api/friends")
      .then((res) => res.json())
      .then((data) => setFriends(data.friends || []))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const shareUrl = useMemo(() => {
    const base = (
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    ).replace(/\/$/, "");
    const path = itemType === "recipe" ? `/recipes/${itemId}` : `/collections/${itemId}`;
    return `${base}${path}`;
  }, [itemType, itemId]);

  const shareText = `Check out "${itemTitle}" on Marco`;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function shareToFriend(friendUserId: string, name: string) {
    if (!friendUserId || sent.has(friendUserId) || sending) return;
    setSending(friendUserId);
    try {
      const endpoint =
        itemType === "recipe" ? "/api/recipes/share" : "/api/collections/share-with-friend";
      const body =
        itemType === "recipe"
          ? { recipe_id: itemId, friend_user_id: friendUserId, message }
          : { collection_id: itemId, friend_user_id: friendUserId };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSent((prev) => new Set(prev).add(friendUserId));
        showToast(`Sent to ${name}`, { variant: "success", icon: "🍅" });
      } else {
        showToast("Couldn't send — try again", { variant: "info" });
      }
    } catch {
      showToast("Couldn't send — try again", { variant: "info" });
    } finally {
      setSending(null);
    }
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    // Prefer the async Clipboard API, but fall back to a hidden textarea +
    // execCommand for WebViews / contexts where it's blocked.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through to legacy path */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      showToast("Link copied", { variant: "success", icon: "🔗" });
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast("Couldn't copy the link", { variant: "info" });
    }
  }

  function handleNativeShare() {
    navigator
      .share?.({ title: itemTitle, text: shareText, url: shareUrl })
      .catch(() => {});
  }

  function openExternal(href: string) {
    window.open(href, "_blank");
  }

  if (!isOpen) return null;

  const fullText = `${shareText}\n${shareUrl}`;
  const smsHref = `sms:?&body=${encodeURIComponent(fullText)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(fullText)}`;

  const filtered = friends.filter((f) =>
    (f.profile?.display_name || "").toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col animate-slide-up"
        style={{ maxHeight: "88dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "#e5e1da" }} />
        </div>

        {/* Title */}
        <div className="px-5 pt-1 pb-2 flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-center truncate" style={{ color: INK }}>
            Share &ldquo;{itemTitle}&rdquo;
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {/* Search */}
          <div className="relative mb-4">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends"
              className="w-full pl-9 pr-3 py-2.5 rounded-full text-sm outline-none"
              style={{ background: "#f3f1ec", color: INK }}
            />
          </div>

          {/* Optional note */}
          {itemType === "recipe" && (
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none mb-4"
              style={{ background: "#f3f1ec", color: INK }}
            />
          )}

          {/* Friends grid */}
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading friends…</div>
          ) : friends.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">No friends yet — add friends to share in-app.</p>
              <p className="text-gray-400 text-xs mt-1">You can still copy the link or share below.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No friends match &ldquo;{search}&rdquo;</div>
          ) : (
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {filtered.map((f) => {
                const friendUserId = f.profile?.user_id || "";
                const name = f.profile?.display_name || "Unknown";
                const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const isSent = sent.has(friendUserId);
                const isSending = sending === friendUserId;
                return (
                  <button
                    key={f.id}
                    onClick={() => shareToFriend(friendUserId, name)}
                    disabled={isSending || isSent}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <div className="relative">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-base overflow-hidden"
                        style={{ background: "#FBEAE6", color: TOMATO, opacity: isSent ? 0.55 : 1 }}
                      >
                        {f.profile?.avatar_url ? (
                          <Image src={f.profile.avatar_url} alt={name} width={64} height={64} className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      {/* sent / sending overlay */}
                      {(isSent || isSending) && (
                        <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.4)" }}>
                          {isSending ? (
                            <span className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: TOMATO, borderTopColor: "transparent" }} />
                          ) : (
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: TOMATO }}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-center leading-tight truncate w-full px-0.5" style={{ color: isSent ? TOMATO : "#4A4742", fontWeight: isSent ? 600 : 400 }}>
                      {isSent ? "Sent" : name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* External targets */}
        <div className="flex-shrink-0 border-t px-5 py-4" style={{ borderColor: "#f0ece3" }}>
          <div className="flex items-start gap-5 overflow-x-auto scrollbar-hide">
            <ExternalTarget label={copied ? "Copied!" : "Copy link"} onClick={handleCopy} bg="#f3f1ec" fg={INK}>
              {copied ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </ExternalTarget>

            {canNativeShare && (
              <ExternalTarget label="Share to…" onClick={handleNativeShare} bg="#f3f1ec" fg={INK}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                </svg>
              </ExternalTarget>
            )}

            <ExternalTarget label="Messages" onClick={() => openExternal(smsHref)} bg="#34C759" fg="#fff">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 01-11.5 7.2L3 21l1.8-4.5A8 8 0 1121 12z" />
              </svg>
            </ExternalTarget>

            <ExternalTarget label="WhatsApp" onClick={() => openExternal(whatsappHref)} bg="#25D366" fg="#fff">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.6 6.3A7.85 7.85 0 0012 4a7.94 7.94 0 00-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 003.8 1h.01A7.94 7.94 0 0017.6 6.3zM12 18.5a6.6 6.6 0 01-3.36-.92l-.24-.14-2.49.65.66-2.43-.16-.25a6.59 6.59 0 1112.13-3.55A6.6 6.6 0 0112 18.5zm3.62-4.94c-.2-.1-1.17-.58-1.35-.64s-.31-.1-.44.1-.51.64-.62.77-.23.15-.43.05a5.4 5.4 0 01-1.59-.98 6 6 0 01-1.1-1.37c-.12-.2 0-.31.09-.41s.2-.23.3-.35a1.3 1.3 0 00.2-.33.37.37 0 00-.02-.35c-.05-.1-.44-1.07-.6-1.46s-.32-.34-.44-.34h-.38a.72.72 0 00-.52.24 2.18 2.18 0 00-.68 1.62A3.79 3.79 0 009 11.1a8.62 8.62 0 003.3 2.92c.46.2.82.32 1.1.4a2.65 2.65 0 001.22.08 2 2 0 001.3-.92 1.62 1.62 0 00.12-.92c-.05-.08-.18-.13-.38-.23z" />
              </svg>
            </ExternalTarget>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExternalTarget({
  label,
  onClick,
  bg,
  fg,
  children,
}: {
  label: string;
  onClick: () => void;
  bg: string;
  fg: string;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform" style={{ width: 64 }}>
      <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: bg, color: fg }}>
        {children}
      </span>
      <span className="text-[11px] text-center leading-tight" style={{ color: "#4A4742" }}>
        {label}
      </span>
    </button>
  );
}
