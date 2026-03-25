"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppNotification } from "@/types";

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

function Avatar({ name, avatar, size = 10 }: { name?: string | null; avatar?: string | null; size?: number }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || ""}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  const initials = name ? name.slice(0, 2).toUpperCase() : "?";
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold`}
      style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}
    >
      {initials}
    </div>
  );
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "friend_request" || type === "friend_accepted") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#fff7ed" }}>
      <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
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

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      onUnreadChange(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  // Fetch when opened
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Mark all as read when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
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
              ? { ...n, _resolved: action } as AppNotification & { _resolved?: string }
              : n
          )
        );
      }
    } finally {
      setRespondingId(null);
    }
  }

  if (!isOpen) return null;

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayItems = visible.filter((n) => new Date(n.created_at) >= today);
  const earlierItems = visible.filter((n) => new Date(n.created_at) < today);

  function renderNotification(n: AppNotification) {
    const resolved = (n as AppNotification & { _resolved?: string })._resolved;

    return (
      <div
        key={n.id}
        className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
          !n.read ? "bg-orange-50/60" : "bg-white"
        }`}
      >
        {/* Avatar or icon */}
        {n.actor_avatar || n.actor_name ? (
          <Avatar name={n.actor_name} avatar={n.actor_avatar} size={10} />
        ) : (
          <NotificationIcon type={n.type} />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug">
            {notificationText(n)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>

          {/* Friend request action buttons */}
          {n.type === "friend_request" && !resolved && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => handleFriendRespond(n, "accept")}
                disabled={respondingId === n.id}
                className="px-4 py-1.5 rounded-full text-xs font-bold text-white active:scale-95 transition-all disabled:opacity-50"
                style={{ background: "#1a1410" }}
              >
                {respondingId === n.id ? "..." : "Accept"}
              </button>
              <button
                onClick={() => handleFriendRespond(n, "decline")}
                disabled={respondingId === n.id}
                className="px-4 py-1.5 rounded-full text-xs font-bold text-gray-600 active:scale-95 transition-all disabled:opacity-50"
                style={{ background: "#f5f0eb" }}
              >
                Decline
              </button>
            </div>
          )}

          {/* Resolved state */}
          {n.type === "friend_request" && resolved && (
            <p className="text-xs font-semibold mt-1.5" style={{ color: resolved === "accept" ? "#16a34a" : "#9ca3af" }}>
              {resolved === "accept" ? "✓ Accepted" : "Declined"}
            </p>
          )}
        </div>

        {/* Unread dot */}
        {!n.read && (
          <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
        )}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[60]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl sm:bottom-auto sm:top-16 sm:right-4 sm:left-auto sm:w-96 sm:rounded-2xl overflow-hidden"
        style={{
          maxHeight: "80vh",
          animation: "fadeSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
        }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-100">
          <h2 className="text-base font-black" style={{ color: "#1a1410" }}>
            Notifications
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 60px)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: "#f5f0eb" }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#a09890" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-700">All caught up!</p>
              <p className="text-xs text-gray-400 mt-0.5">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayItems.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Today</p>
                  {todayItems.map(renderNotification)}
                </>
              )}
              {earlierItems.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Earlier</p>
                  {earlierItems.map(renderNotification)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
