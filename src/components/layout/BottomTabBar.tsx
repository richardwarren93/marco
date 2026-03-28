"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  RecipesIcon,
  GroceryIcon,
  MealPlanIcon,
} from "@/components/icons/HandDrawnIcons";
import ImportRecipeSheet from "@/components/recipes/ImportRecipeSheet";

const ACCENT = "#ea580c";

const leftTabs = [
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/meal-plan", label: "Meal Plan", Icon: MealPlanIcon },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [importExpanded, setImportExpanded] = useState(false);
  const [showImport, setShowImport] = useState(false);

  if (pathname.startsWith("/auth") || pathname.startsWith("/onboarding")) {
    return null;
  }

  const isProfileActive = pathname.startsWith("/profile");
  const isGroceryActive = pathname.startsWith("/grocery");
  const isOnMealPlan = pathname.startsWith("/meal-plan");

  function closeFab() {
    setFabOpen(false);
    setImportExpanded(false);
  }

  function handleAddMeal() {
    closeFab();
    if (isOnMealPlan) {
      window.dispatchEvent(new CustomEvent("openMealAddSheet"));
    } else {
      router.push("/meal-plan");
    }
  }

  function handleImportLink() {
    closeFab();
    router.push("/recipes/new?mode=url");
  }

  function handleImportPhoto() {
    closeFab();
    setShowImport(true);
  }

  function handleImportText() {
    closeFab();
    setShowImport(true);
  }

  return (
    <>
      {/* Dim overlay */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(2px)" }}
          onClick={closeFab}
        />
      )}

      {/* Floating popup */}
      {fabOpen && (
        <div
          className="fixed z-50 left-1/2 sm:hidden"
          style={{
            bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 14px)",
            animation: "fabMenuIn 0.22s cubic-bezier(0.34,1.2,0.64,1) both",
          }}
        >
          {/* Outer clip — fixed width, hides the offscreen panel */}
          <div
            style={{
              width: 220,
              overflow: "hidden",
              borderRadius: 16,
              background: "white",
              boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
              height: importExpanded ? 220 : 121,
              transition: "height 0.22s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* Sliding track — two panels side by side */}
            <div
              style={{
                display: "flex",
                width: "200%",
                transform: importExpanded ? "translateX(-50%)" : "translateX(0)",
                transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {/* ── Panel 1: Main menu ── */}
              <div style={{ width: "50%", flexShrink: 0 }}>
                {/* Add meal */}
                <button
                  onClick={handleAddMeal}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff7ed" }}>
                    <svg className="w-3.5 h-3.5" style={{ color: ACCENT }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Add meal</p>
                </button>

                <div className="mx-4" style={{ height: 1, background: "#f0f0ee" }} />

                {/* Import recipe → */}
                <button
                  onClick={() => setImportExpanded(true)}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 flex-1">Import recipe</p>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* ── Panel 2: Import sub-options ── */}
              <div style={{ width: "50%", flexShrink: 0 }}>
                {/* Back row */}
                <button
                  onClick={() => setImportExpanded(false)}
                  className="flex items-center gap-2 px-4 py-3 w-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  style={{ borderBottom: "1px solid #f0f0ee" }}
                >
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#aaa" }}>Import</p>
                </button>

                {/* Paste link */}
                <button
                  onClick={handleImportLink}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Paste link</p>
                </button>

                <div className="mx-4" style={{ height: 1, background: "#f0f0ee" }} />

                {/* Photo */}
                <button
                  onClick={handleImportPhoto}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Photo</p>
                </button>

                <div className="mx-4" style={{ height: 1, background: "#f0f0ee" }} />

                {/* Text */}
                <button
                  onClick={handleImportText}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Text</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white border-t border-gray-100 touch-manipulation"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", willChange: "transform" }}
      >
        <div className="flex justify-around items-end h-16 px-1">
          {leftTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors"
                style={{ color: isActive ? ACCENT : "#b0b0b0" }}
              >
                <tab.Icon className="w-6 h-6" filled={isActive} />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* Center FAB — raised */}
          <div className="flex flex-col items-center justify-end flex-1 pb-2">
            <button
              onClick={() => setFabOpen((v) => !v)}
              className="-translate-y-5 active:scale-90 transition-all duration-150 touch-manipulation"
              aria-label={fabOpen ? "Close menu" : "Add or import"}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: ACCENT,
                boxShadow: fabOpen
                  ? `0 0 0 4px white, 0 4px 24px rgba(234,88,12,0.55)`
                  : `0 0 0 4px white, 0 4px 20px rgba(234,88,12,0.38)`,
                transition: "box-shadow 0.2s ease",
              }}
            >
              <span
                className="flex items-center justify-center w-full h-full"
                style={{
                  transition: "transform 0.22s ease",
                  transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
                }}
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </span>
            </button>
          </div>

          {/* Grocery */}
          <Link
            href="/grocery"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors"
            style={{ color: isGroceryActive ? ACCENT : "#b0b0b0" }}
          >
            <GroceryIcon className="w-6 h-6" filled={isGroceryActive} />
            <span className="text-[10px] font-medium leading-tight">Grocery</span>
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors"
            style={{ color: isProfileActive ? ACCENT : "#b0b0b0" }}
          >
            <svg
              className="w-6 h-6"
              fill={isProfileActive ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-[10px] font-medium leading-tight">Profile</span>
          </Link>
        </div>
      </nav>

      <ImportRecipeSheet isOpen={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
