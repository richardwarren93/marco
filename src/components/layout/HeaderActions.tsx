"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import dynamic from "next/dynamic";

const NotificationSheet = dynamic(() => import("@/components/notifications/NotificationSheet"), { ssr: false });

/**
 * HeaderActions — notification bell + profile avatar.
 * Designed to be embedded in any header row (meal plan, grocery, etc.)
 */
export default function HeaderActions() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("?");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

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
      setInitials(data.display_name ? data.display_name.slice(0, 2).toUpperCase() : "?");
    }
  }

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
      <div className="flex items-center gap-1 flex-shrink-0 sm:hidden">
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
