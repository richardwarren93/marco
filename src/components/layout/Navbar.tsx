"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import {
  FriendsIcon,
} from "@/components/icons/HandDrawnIcons";
import NotificationSheet from "@/components/notifications/NotificationSheet";
import ImportRecipeSheet from "@/components/recipes/ImportRecipeSheet";

// ── Tab config for the recipes page (rendered in navbar on desktop) ───────────
const TAB_CONFIG: { key: string; label: string; emoji: string }[] = [
  { key: "recipes", label: "My Recipes", emoji: "📖" },
  { key: "discover", label: "Discover", emoji: "🔍" },
  { key: "meal-plan", label: "Meal Plan", emoji: "📅" },
  { key: "grocery", label: "Grocery", emoji: "🛒" },
];

// Menu items removed — community deleted, friends accessible from profile

export default function Navbar() {
  return (
    <Suspense>
      <NavbarInner />
    </Suspense>
  );
}

function NavbarInner() {
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isAuthPage = pathname.startsWith("/auth") || pathname.startsWith("/onboarding");
  const isProfilePage = pathname === "/profile";
  const isRecipesPage = pathname === "/recipes" || pathname.startsWith("/recipes") || pathname.startsWith("/collections");
  const activeTab = searchParams.get("tab") || "recipes";

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // ignore
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      setAvatarUrl(data.profile?.avatar_url || null);
    } catch {
      // ignore
    }
  }, []);

  // All hooks must be called unconditionally — guard with isAuthPage inside
  useEffect(() => {
    if (isAuthPage) return;
    supabase.auth.getUser().then(({ data: { user: u } }: { data: { user: User | null } }) => {
      setUser(u);
      if (u) {
        fetchUnreadCount();
        fetchProfile();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user: User | null } | null) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUnreadCount();
        fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for new notifications every 60s
  useEffect(() => {
    if (isAuthPage || !user) return;
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [isAuthPage, user, fetchUnreadCount]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  // Hide on auth and onboarding pages — after all hooks
  if (isAuthPage) {
    return null;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setShowMenu(false);
    router.push("/");
    router.refresh();
  }

  const initials = user?.email
    ?.split("@")[0]
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <>
      <nav className="hidden sm:block bg-[#faf9f7] sticky top-0 z-40" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-10 sm:h-14 items-center">
            {/* Left: Page title on mobile, Marco logo on desktop */}
            <Link href={user ? "/recipes" : "/"} className="hidden sm:block text-2xl font-black text-orange-600 tracking-tight">
              Marco
            </Link>
            {(() => {
              const mobileTitle = user
                ? pathname === "/recipes" && activeTab === "recipes" ? "My Recipes"
                : pathname === "/recipes" && activeTab === "discover" ? "Explore Recipes"
                : pathname === "/profile" ? "Profile"
                : pathname.startsWith("/friends") ? "Friends"
                : pathname.startsWith("/collections") ? "Collections"
                : null
                : null;
              return mobileTitle ? (
                <span className="sm:hidden text-lg font-black tracking-tight" style={{ color: "#1a1410" }}>
                  {mobileTitle}
                </span>
              ) : (
                <div className="sm:hidden flex-1" />
              );
            })()}

            {/* Center: Page tabs (desktop only, on recipes page) */}
            {isRecipesPage && user && (
              <div className="hidden sm:flex items-end gap-0.5 -mb-[1px]">
                {TAB_CONFIG.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <Link
                      key={tab.key}
                      href={tab.key === "recipes" ? "/recipes" : `/recipes?tab=${tab.key}`}
                      className="flex items-center gap-1.5 px-4 pt-2 pb-2.5 text-sm font-semibold transition-all duration-200 relative"
                      style={{
                        background: isActive ? "#fff" : "transparent",
                        color: isActive ? "#ea580c" : "#9a918a",
                        borderRadius: "12px 12px 0 0",
                        borderTop: isActive ? "2px solid #fb923c" : "2px solid transparent",
                        borderLeft: isActive ? "1px solid #ede8e0" : "1px solid transparent",
                        borderRight: isActive ? "1px solid #ede8e0" : "1px solid transparent",
                        borderBottom: isActive ? "1px solid #fff" : "1px solid transparent",
                        marginBottom: isActive ? "-1px" : "0",
                      }}
                    >
                      <span className="text-xs">{tab.emoji}</span>
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right: Notifications + Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
              {user ? (
                <>
                  {/* Notification bell — bigger */}
                  <button
                    onClick={() => setShowNotifications(true)}
                    className="relative w-10 h-10 rounded-full hover:bg-gray-100/60 flex items-center justify-center transition-colors"
                    aria-label="Notifications"
                  >
                    <svg
                      className={`w-6 h-6 transition-colors ${unreadCount > 0 ? "text-red-500 fill-red-500 animate-bell-ring" : "text-gray-500"}`}
                      fill={unreadCount > 0 ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={unreadCount > 0 ? 1.5 : 1.8}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[#faf9f7]" />
                    )}
                  </button>

                  {/* Profile avatar — always visible */}
                  <Link
                    href="/profile"
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-[11px] hover:shadow-md transition-all overflow-hidden"
                  >
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Profile" width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                    Log in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Notification sheet */}
      <NotificationSheet
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadChange={setUnreadCount}
      />

      {/* Import recipe sheet */}
      <ImportRecipeSheet
        isOpen={showImport}
        onClose={() => setShowImport(false)}
      />
    </>
  );
}
