"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  RecipesIcon,
  GroceryIcon,
  MealPlanIcon,
} from "@/components/icons/HandDrawnIcons";
import ImportRecipeSheet from "@/components/recipes/ImportRecipeSheet";

const leftTabs = [
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/meal-plan", label: "Meal Plan", Icon: MealPlanIcon },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const [showImport, setShowImport] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const initials = user?.email?.split("@")[0].slice(0, 2).toUpperCase() ?? "?";
  const isProfileActive = pathname.startsWith("/profile");
  const isGroceryActive = pathname.startsWith("/grocery");

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/90 backdrop-blur-lg border-t border-gray-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", willChange: "transform" }}
      >
        <div className="flex justify-around items-end h-16 px-1">
          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors ${
                  isActive ? "text-orange-600" : "text-gray-400"
                }`}
              >
                <tab.Icon className="w-6 h-6" filled={isActive} />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* Center + button */}
          <div className="flex flex-col items-center justify-end flex-1 pb-2">
            <button
              onClick={() => setShowImport(true)}
              className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg -translate-y-2 hover:bg-orange-600 active:bg-orange-700 transition-colors"
              aria-label="Import recipe"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Grocery tab */}
          <Link
            href="/grocery"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors ${
              isGroceryActive ? "text-orange-600" : "text-gray-400"
            }`}
          >
            <GroceryIcon className="w-6 h-6" filled={isGroceryActive} />
            <span className="text-[10px] font-medium leading-tight">Grocery</span>
          </Link>

          {/* Profile tab — uses real avatar */}
          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors ${
              isProfileActive ? "text-orange-600" : "text-gray-400"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-[10px] transition-all ${
                isProfileActive ? "ring-2 ring-orange-500 ring-offset-1" : ""
              }`}
            >
              {initials}
            </span>
            <span className="text-[10px] font-medium leading-tight">Profile</span>
          </Link>
        </div>
      </nav>

      <ImportRecipeSheet isOpen={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
