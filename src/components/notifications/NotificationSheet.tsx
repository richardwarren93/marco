"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import type { AppNotification } from "@/types";
import { BUTTER, CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, LAV, LIME, MUSTARD, PAPER, TOMATO } from "@/lib/theme";

/* Only the light half of the palette — these sit behind INK initials. Same
   rule and same hash as the household members list. */
const STICKERS = [BUTTER, LIME, LAV, MUSTARD];

function stickerFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return STICKERS[Math.abs(hash) % STICKERS.length];
}

interface SuggestedUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  friend_code: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function notificationText(n: AppNotification): string {
  switch (n.type) {
    case "friend_request":
      return `${n.actor_name || "Someone"} sent you a friend request`;
    case "friend_accepted":
      return `${n.actor_name || "Someone"} accepted your friend request`;
    case "recipe_shared":
      return `${n.actor_name || "Someone"} shared "${n.recipe_title || "a recipe"}" with you`;
    case "recipe_saved":
      return `${n.actor_name || "Someone"} saved your recipe "${n.recipe_title || ""}"`;
    default:
      return "New notification";
  }
}

function Avatar({
  name,
  avatar,
  size = 10,
}: {
  name?: string | null;
  avatar?: string | null;
  size?: number;
}) {
  const px = size * 4;
  const box = { width: px, height: px, borderRadius: 99, flexShrink: 0 } as const;
  if (avatar) {
    return <Image src={avatar} alt={name || ""} width={px} height={px} className="object-cover" style={{ ...box, border: `2px solid ${INK}` }} />;
  }
  const initials = name ? name.slice(0, 2).toUpperCase() : "?";
  return (
    <div
      className="flex items-center justify-center"
      style={{
        ...box,
        background: stickerFor(name || "?"),
        color: INK,
        border: `2px solid ${INK}`,
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: size <= 8 ? 10 : 12,
      }}
    >
      {initials}
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}

export default function NotificationSheet({ isOpen, onClose, onUnreadChange }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Suggested befriend state
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [befriendingInProgress, setBefriendingInProgress] = useState<string | null>(null);
  const [dismissedSuggested, setDismissedSuggested] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [notifRes, suggestRes] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/users/suggested"),
      ]);
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.notifications || []);
        onUnreadChange(data.unreadCount ?? 0);
      }
      if (suggestRes.ok) {
        const data = await suggestRes.json();
        setSuggested(data.suggested || []);
      }
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Mark all as read when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        onUnreadChange(0);
      })
      .catch(() => {});
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFriendRespond(notification: AppNotification, action: "accept" | "decline") {
    if (!notification.reference_id) return;
    setRespondingId(notification.id);
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: notification.reference_id, action }),
      });
      if (res.ok) {
        setDismissed((prev) => new Set([...prev, notification.id]));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? ({ ...n, _resolved: action } as AppNotification & { _resolved?: string })
              : n
          )
        );
      }
    } finally {
      setRespondingId(null);
    }
  }

  async function handleBefriend(profile: SuggestedUser) {
    setBefriendingInProgress(profile.user_id);
    try {
      const res = await fetch("/api/friends/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_user_id: profile.user_id }),
      });
      if (res.ok) {
        setPendingIds((prev) => new Set([...prev, profile.user_id]));
      }
    } finally {
      setBefriendingInProgress(null);
    }
  }

  if (!isOpen) return null;

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayItems = visible.filter((n) => new Date(n.created_at) >= today);
  const earlierItems = visible.filter((n) => new Date(n.created_at) < today);
  const visibleSuggested = suggested.filter((s) => !dismissedSuggested.has(s.user_id));

  function renderNotification(n: AppNotification) {
    const resolved = (n as AppNotification & { _resolved?: string })._resolved;
    return (
      <div
        key={n.id}
        className="flex items-start gap-3 px-4 py-3.5"
        style={{ background: !n.read ? "rgba(255,216,77,0.35)" : PAPER }}
      >
        <Avatar name={n.actor_name} avatar={n.actor_avatar} size={10} />
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug" style={{ color: INK }}>{notificationText(n)}</p>
          <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{timeAgo(n.created_at)}</p>
          {n.type === "friend_request" && !resolved && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => handleFriendRespond(n, "accept")}
                disabled={respondingId === n.id}
                className="px-4 py-1.5 text-xs flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: INK, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 99, boxShadow: `2px 2px 0 ${INK}`, minWidth: 72, minHeight: 28 }}
              >
                {respondingId === n.id ? (
                  <div className="w-3 h-3 border-2 border-[var(--paper)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Accept"
                )}
              </button>
              <button
                onClick={() => handleFriendRespond(n, "decline")}
                disabled={respondingId === n.id}
                className="px-4 py-1.5 text-xs active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 99, boxShadow: `2px 2px 0 ${INK}` }}
              >
                Decline
              </button>
            </div>
          )}
          {n.type === "friend_request" && resolved && (
            <p
              className="text-xs font-semibold mt-1.5"
              style={{ color: resolved === "accept" ? INK : INK_MUTED }}
            >
              {resolved === "accept" ? "✓ Accepted" : "Declined"}
            </p>
          )}
        </div>
        {!n.read && (
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: TOMATO, border: `1.5px solid ${INK}` }} />
        )}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed sm:absolute bottom-0 left-0 right-0 z-[70] sm:bottom-auto sm:top-full sm:mt-2 sm:right-0 sm:left-auto sm:w-80 overflow-hidden"
        style={{
          background: PAPER,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: `2.5px solid ${INK}`,
          borderLeft: `2.5px solid ${INK}`,
          borderRight: `2.5px solid ${INK}`,
          maxHeight: "85vh",
          animation: "fadeSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
        }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: INK, opacity: 0.25 }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-3 flex-shrink-0" style={{ borderBottom: `2.5px solid ${INK}` }}>
          <h2 className="text-base" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>
            Notifications
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-black/5 transition-colors"
          >
            <svg className="w-4 h-4" style={{ color: INK_MUTED }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 64px)", paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Notifications ──────────────────────────────────────── */}
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ background: LIME, border: `2px solid ${INK}` }}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={INK_MUTED} strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>All caught up!</p>
                  <p className="text-xs mt-0.5" style={{ color: INK_SOFT }}>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(23,20,16,0.12)]">
                  {todayItems.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: INK_MUTED, fontWeight: 700 }}>
                        Today
                      </p>
                      {todayItems.map(renderNotification)}
                    </>
                  )}
                  {earlierItems.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: INK_MUTED, fontWeight: 700 }}>
                        Earlier
                      </p>
                      {earlierItems.map(renderNotification)}
                    </>
                  )}
                </div>
              )}

              {/* ── Suggested members ─────────────────────────────────── */}
              {visibleSuggested.length > 0 && (
                <div className="mt-1" style={{ borderTop: `2px solid ${INK}` }}>
                  <p className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.16em]" style={{ color: INK_MUTED, fontWeight: 700 }}>
                    Suggested members
                  </p>
                  <div className="divide-y divide-[rgba(23,20,16,0.12)] pb-4">
                    {visibleSuggested.map((profile) => {
                      const isPending = pendingIds.has(profile.user_id);
                      const inProgress = befriendingInProgress === profile.user_id;
                      return (
                        <div
                          key={profile.user_id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <Avatar name={profile.display_name} avatar={profile.avatar_url} size={10} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700 }}>
                              {profile.display_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isPending ? (
                              <span
                                className="px-4 py-1.5 text-xs"
                                style={{ background: CREAM_WARM, color: INK_SOFT, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 99 }}
                              >
                                Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => handleBefriend(profile)}
                                disabled={inProgress}
                                className="px-4 py-1.5 text-xs flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                                style={{ background: INK, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 99, boxShadow: `2px 2px 0 ${INK}`, minWidth: 82, minHeight: 28 }}
                              >
                                {inProgress ? (
                                  <div className="w-3 h-3 border-2 border-[var(--paper)] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  "Befriend"
                                )}
                              </button>
                            )}
                            {!isPending && (
                              <button
                                onClick={() =>
                                  setDismissedSuggested(
                                    (prev) => new Set([...prev, profile.user_id])
                                  )
                                }
                                className="w-7 h-7 flex items-center justify-center rounded-full active:bg-black/5 transition-colors" style={{ color: INK_MUTED }}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
