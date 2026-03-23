"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  RecipesIcon,
  GroceryIcon,
  MealPlanIcon,
} from "@/components/icons/HandDrawnIcons";
import ImportRecipeSheet from "@/components/recipes/ImportRecipeSheet";

const navLinks = [
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/grocery", label: "Grocery", Icon: GroceryIcon },
  { href: "/meal-plan", label: "Meal Plan", Icon: MealPlanIcon },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showImport, setShowImport] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Hide on auth and onboarding pages
  if (pathname.startsWith("/auth") || pathname.startsWith("/onboarding")) {
    return null;
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = user?.email
    ?.split("@")[0]
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <>
      <nav className="bg-white/90 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            {/* Left: Logo — links to recipes for logged-in users */}
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
                  {/* Import Recipe button — desktop only (mobile uses center + in BottomTabBar) */}
                  <button
                    onClick={() => setShowImport(true)}
                    className="hidden sm:flex bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Import Recipe
                  </button>
                  {/* Profile avatar — desktop only; mobile uses bottom nav */}
                  <Link
                    href="/profile"
                    className="hidden sm:flex w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white items-center justify-center font-bold text-xs hover:shadow-md transition-all"
                  >
                    {initials}
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

      <ImportRecipeSheet isOpen={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
