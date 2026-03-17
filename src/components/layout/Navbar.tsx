"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  RecipesIcon,
  CollectionsIcon,
  EatsIcon,
  PantryIcon,
  MealPlanIcon,
} from "@/components/icons/HandDrawnIcons";

const navLinks = [
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/collections", label: "Collections", Icon: CollectionsIcon },
  { href: "/eats", label: "Eats", Icon: EatsIcon },
  { href: "/pantry", label: "Pantry", Icon: PantryIcon },
  { href: "/meal-plan", label: "Meal Plan", Icon: MealPlanIcon },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

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
    <nav className="bg-white/90 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center">
          {/* Left: Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-orange-600">
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
                <Link
                  href="/recipes/new"
                  className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <span className="sm:hidden">+ Save</span>
                  <span className="hidden sm:inline">+ Save Recipe</span>
                </Link>
                <Link
                  href="/profile"
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-xs hover:shadow-md transition-all"
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
  );
}
