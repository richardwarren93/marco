"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import {
  RecipesIcon,
  GroceryIcon,
  MealPlanIcon,
  FriendsIcon,
} from "@/components/icons/HandDrawnIcons";
import NotificationSheet from "@/components/notifications/NotificationSheet";

const navLinks = [
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/grocery", label: "Grocery", Icon: GroceryIcon },
  { href: "/meal-plan", label: "Meal Plan", Icon: MealPlanIcon },
];

const menuItems: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/community",
    label: "Community",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    href: "/friends",
    label: "Friends",
    icon: <FriendsIcon className="w-5 h-5" />,
  },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isAuthPage = pathname.startsWith("/auth") || pathname.startsWith("/onboarding");

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

  // All hooks must be called unconditionally — guard with isAuthPage inside
  useEffect(() => {
    if (isAuthPage) return;
    supabase.auth.getUser().then(({ data: { user: u } }: { data: { user: User | null } }) => {
      setUser(u);
      if (u) fetchUnreadCount();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user: User | null } | null) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUnreadCount();
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
      <nav className="bg-[#faf9f7]/95 backdrop-blur-lg border-b border-[#ede8e0] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            {/* Left: Logo */}
            <Link href={user ? "/recipes" : "/"} className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-orange-600">
              <Image src="/marco-icon.svg" alt="Marco" width={28} height={28} className="rounded-full sm:w-8 sm:h-8" />
              Marco
            </Link>

            {/* Center: Desktop nav links */}
            {user && (
              <div className="hidden sm:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-500 hover:text-gray-900 hover:bg-gray-50 text-sm font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <link.Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <>
                  {/* Profile avatar — desktop only */}
                  <Link
                    href="/profile"
                    className="hidden sm:flex w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white items-center justify-center font-bold text-xs hover:shadow-md transition-all"
                  >
                    {initials}
                  </Link>

                  {/* Notification bell */}
                  <button
                    onClick={() => setShowNotifications(true)}
                    className="relative w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    aria-label="Notifications"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Hamburger menu button */}
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                      aria-label="Menu"
                    >
                      {showMenu ? (
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                      )}
                    </button>

                    {/* Dropdown menu */}
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 animate-pop-in z-50">
                        {menuItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowMenu(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              pathname.startsWith(item.href)
                                ? "text-orange-600 bg-orange-50"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        ))}

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-1.5" />

                        {/* Profile — mobile only in menu since desktop has avatar */}
                        <Link
                          href="/profile"
                          onClick={() => setShowMenu(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm sm:hidden transition-colors ${
                            pathname.startsWith("/profile")
                              ? "text-orange-600 bg-orange-50"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          <span className="font-medium">Profile</span>
                        </Link>

                        {/* Settings placeholder */}
                        <button
                          onClick={() => { setShowMenu(false); router.push("/profile"); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors hidden sm:flex"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">Settings</span>
                        </button>

                        <div className="border-t border-gray-100 my-1.5" />

                        {/* Logout */}
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                          </svg>
                          <span className="font-medium">Log out</span>
                        </button>
                      </div>
                    )}
                  </div>
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
    </>
  );
}
