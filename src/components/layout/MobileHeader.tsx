"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import dynamic from "next/dynamic";

const NotificationSheet = dynamic(() => import("@/components/notifications/NotificationSheet"), { ssr: false });

/**
 * MobileHeader — inline page header with notifications + profile avatar.
 * Rendered by each page, NOT as a global navbar.
 *
 * Usage:
 *   <MobileHeader title="My Recipes" />
 *   <MobileHeader>{customLeftContent}</MobileHeader>
 */
export default function MobileHeader({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("?");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Auth + profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user ?? null);
      if (data.user) fetchProfile(data.user.id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("user_profiles").select("display_name, avatar_url").eq("user_id", userId).single();
    if (data) {
      setAvatarUrl(data.avatar_url);
      setInitials(
        data.display_name
          ? data.display_name.slice(0, 2).toUpperCase()
          : "?"
      );
    }
  }

  // Unread notifications
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  }, [user, supabase]);

  useEffect(() => {
    if (user) fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  if (!user) return null;

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-2 pb-1 sm:hidden">
        {/* Left: page title or custom content */}
        {children ? (
          <div className="flex-1 min-w-0">{children}</div>
        ) : title ? (
          <h1 className="text-lg font-black tracking-tight" style={{ color: "#1a1410" }}>
            {title}
          </h1>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right: notifications + profile */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-9 h-9 rounded-full hover:bg-gray-100/60 flex items-center justify-center transition-colors"
            aria-label="Notifications"
          >
            <svg
              className={`w-[22px] h-[22px] transition-colors ${unreadCount > 0 ? "text-red-500 fill-red-500" : "text-gray-500"}`}
              fill={unreadCount > 0 ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={unreadCount > 0 ? 1.5 : 1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#faf9f7]" />
            )}
          </button>

          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-[11px] overflow-hidden"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Profile" width={32} height={32} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </Link>
        </div>
      </div>

      {/* Notification sheet */}
      {showNotifications && (
        <NotificationSheet
          isOpen={showNotifications}
          onClose={() => { setShowNotifications(false); fetchUnreadCount(); }}
          onUnreadChange={(n: number) => setUnreadCount(n)}
        />
      )}
    </>
  );
}
